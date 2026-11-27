import Cocoa
import Foundation
import RaycastSwiftMacros

struct EditorInput: Decodable {
    let text: String
    let indent: Int
}

private struct EditorLaunchError: LocalizedError {
    let message: String
    var errorDescription: String? { message }
}

private func editorDirectory(for request: URL) -> URL {
    request.deletingLastPathComponent().appendingPathComponent("editor-" + request.deletingPathExtension().lastPathComponent)
}

private func workerBundle(for request: URL) -> URL {
    request.deletingLastPathComponent().appendingPathComponent("worker-" + request.deletingPathExtension().lastPathComponent + ".app")
}

private func prepareWorker(from executable: URL, in bundle: URL) throws -> URL {
    let contents = bundle.appendingPathComponent("Contents")
    let macOS = contents.appendingPathComponent("MacOS")
    try FileManager.default.createDirectory(at: macOS, withIntermediateDirectories: true, attributes: [.posixPermissions: 0o700])
    let binary = macOS.appendingPathComponent("json-editor")
    try FileManager.default.copyItem(at: executable, to: binary)
    let info: [String: Any] = [
        "CFBundleExecutable": "json-editor",
        "CFBundleIdentifier": "local.raycast.json-workbench",
        "CFBundleName": "JSON Workbench",
        "CFBundleDisplayName": "JSON Workbench",
        "CFBundlePackageType": "APPL",
        "CFBundleVersion": "1",
        "NSHighResolutionCapable": true,
    ]
    let data = try PropertyListSerialization.data(fromPropertyList: info, format: .xml, options: 0)
    try data.write(to: contents.appendingPathComponent("Info.plist"), options: .atomic)
    return binary
}

@raycast
func startEditor(requestPath: String) throws {
    let request = URL(fileURLWithPath: requestPath)
    guard FileManager.default.fileExists(atPath: requestPath) else {
        throw EditorLaunchError(message: "The editor input file is missing.")
    }
    let worker = Process()
    let bundle = workerBundle(for: request)
    let encodedPath = String(data: try JSONEncoder().encode(requestPath), encoding: .utf8)!
    worker.arguments = ["runEditorWorker", encodedPath]
    worker.standardInput = FileHandle.nullDevice
    worker.standardOutput = FileHandle.nullDevice
    worker.standardError = FileHandle.nullDevice
    do {
        worker.executableURL = try prepareWorker(from: URL(fileURLWithPath: CommandLine.arguments[0]), in: bundle)
        try worker.run()
        let deadline = Date().addingTimeInterval(5)
        while FileManager.default.fileExists(atPath: requestPath) {
            guard worker.isRunning else {
                throw EditorLaunchError(message: "The editor exited before reading its input.")
            }
            guard Date() < deadline else {
                throw EditorLaunchError(message: "The editor did not read its input within 5 seconds.")
            }
            Thread.sleep(forTimeInterval: 0.025)
        }
    } catch {
        if worker.isRunning { worker.terminate(); worker.waitUntilExit() }
        try? FileManager.default.removeItem(at: editorDirectory(for: request))
        try? FileManager.default.removeItem(at: bundle)
        throw error
    }
}

@raycast
func runEditorWorker(requestPath: String) throws {
    let request = URL(fileURLWithPath: requestPath)
    let attributes = try FileManager.default.attributesOfItem(atPath: requestPath)
    guard (attributes[.size] as? Int ?? 0) <= 6 * 8 * 1024 * 1024 + 1024 else {
        throw EditorLaunchError(message: "The editor input exceeds 8 MiB.")
    }
    let input = try JSONDecoder().decode(EditorInput.self, from: Data(contentsOf: request))
    guard input.text.utf8.count <= 8 * 1024 * 1024 else {
        throw EditorLaunchError(message: "The editor input exceeds 8 MiB.")
    }
    let directory = editorDirectory(for: request)
    defer {
        try? FileManager.default.removeItem(at: directory)
        try? FileManager.default.removeItem(at: workerBundle(for: request))
    }
    try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: false, attributes: [.posixPermissions: 0o700])
    try EmbeddedEditor.write(to: directory)
    MainActor.assumeIsolated {
        let application = NSApplication.shared
        application.setActivationPolicy(.regular)
        let controller = EditorDelegate(request: request, editorDirectory: directory, workerBundle: workerBundle(for: request), html: directory.appendingPathComponent("index.html"), input: input)
        application.delegate = controller
        application.run()
        // NSApplication's delegate is weak; keep it alive for the whole run loop.
        withExtendedLifetime(controller) {}
    }
}
