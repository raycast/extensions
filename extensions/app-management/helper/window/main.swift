// window-helper — on-demand helper for the App Window Switcher Raycast extension.
// One JSON document on stdout per run; diagnostics on stderr. No state, no network, exits when done.

import AppKit
import ApplicationServices
import Foundation

let helperSchema = 1
let helperVersion = "0.1.0"

func emit<T: Encodable>(_ value: T) {
    let encoder = JSONEncoder()
    encoder.outputFormatting = [.sortedKeys]
    guard let data = try? encoder.encode(value), let text = String(data: data, encoding: .utf8) else {
        FileHandle.standardError.write("window-helper: could not encode response\n".data(using: .utf8)!)
        exit(1)
    }
    print(text)
}

struct VersionResponse: Codable {
    let schema: Int
    let helper: String
    let macos: String
}

struct CheckResponse: Codable {
    let schema: Int
    let helper: String
    let accessibilityTrusted: Bool
    let privateSymbols: [String: String?]
    let connection: Int32?
    let displays: Int
}

struct UsageError: Codable {
    let schema: Int
    let ok: Bool
    let code: String
    let message: String
}

func usage(_ message: String) -> Never {
    emit(UsageError(schema: helperSchema, ok: false, code: "usage", message: message))
    exit(2)
}

func option(_ name: String) -> String? {
    let args = CommandLine.arguments
    guard let i = args.firstIndex(of: name), i + 1 < args.count else { return nil }
    return args[i + 1]
}

func parseTarget() -> (pid_t, CGWindowID) {
    let args = CommandLine.arguments
    guard args.count >= 4, let pid = Int32(args[2]), pid > 0, let wid = UInt32(args[3]), wid > 0 else {
        usage("Usage: window-helper \(args[1]) <pid> <window-id>")
    }
    return (pid, wid)
}

AXUIElementSetMessagingTimeout(AXUIElementCreateSystemWide(), 1.0)

let arguments = CommandLine.arguments
guard arguments.count >= 2 else { usage("Usage: window-helper list | focus <pid> <window-id> | quit <pid> | check | version") }

switch arguments[1] {
case "version":
    let v = ProcessInfo.processInfo.operatingSystemVersion
    emit(VersionResponse(schema: helperSchema, helper: helperVersion, macos: "\(v.majorVersion).\(v.minorVersion).\(v.patchVersion)"))
case "check":
    let api = PrivateAPI.shared
    let topology = spacesTopology()
    emit(
        CheckResponse(
            schema: helperSchema, helper: helperVersion, accessibilityTrusted: AXIsProcessTrusted(),
            privateSymbols: api.resolvedNames, connection: api.connection, displays: topology.displays.count))
case "list":
    emit(buildList(debug: CommandLine.arguments.contains("--debug")))
case "focus":
    let (pid, wid) = parseTarget()
    let mode = ActivationMode(rawValue: option("--activation") ?? "auto") ?? .auto
    emit(focusWindow(pid: pid, wid: wid, mode: mode, expectedBundle: option("--bundle")))
case "quit":
    let args = CommandLine.arguments
    guard args.count >= 3, let pid = Int32(args[2]), pid > 0 else { usage("Usage: window-helper quit <pid>") }
    emit(quitApp(pid: pid, expectedBundle: option("--bundle")))
default:
    usage("Unknown command \(arguments[1])")
}
