import Foundation

private func argument(after flag: String) -> String? {
    guard let index = CommandLine.arguments.firstIndex(of: flag), index + 1 < CommandLine.arguments.count else { return nil }
    return CommandLine.arguments[index + 1]
}

private func printJSON<T: Encodable>(_ value: T) throws {
    let encoder = JSONEncoder()
    encoder.outputFormatting = [.prettyPrinted, .sortedKeys]
    FileHandle.standardOutput.write(try encoder.encode(value))
    FileHandle.standardOutput.write(Data([0x0A]))
}

do {
    switch CommandLine.arguments.dropFirst().first ?? "help" {
    case "devices": try printJSON(DeviceListResponse(devices: DeviceMonitor().devices()))
    case "access": try printJSON(accessStatus(prompt: CommandLine.arguments.contains("--prompt")))
    case "run":
        guard let path = argument(after: "--config"), let state = argument(after: "--state") else {
            throw CocoaError(.fileNoSuchFile, userInfo: [NSLocalizedDescriptionKey: "run requires --config <path> --state <path>"])
        }
        try HelperRuntime(configURL: URL(fileURLWithPath: path), statusURL: URL(fileURLWithPath: state)).run()
    case "status":
        guard let state = argument(after: "--state"), let expected = argument(after: "--expected-executable") else {
            throw CocoaError(.fileNoSuchFile, userInfo: [NSLocalizedDescriptionKey: "status requires --state <path> --expected-executable <path>"])
        }
        try printJSON(inspectRuntime(statusURL: URL(fileURLWithPath: state), expectedExecutable: expected))
    case "stop":
        guard let state = argument(after: "--state"), let expected = argument(after: "--expected-executable") else {
            throw CocoaError(.fileNoSuchFile, userInfo: [NSLocalizedDescriptionKey: "stop requires --state <path> --expected-executable <path>"])
        }
        try printJSON(stopRuntime(statusURL: URL(fileURLWithPath: state), expectedExecutable: expected))
    case "version": try printJSON(VersionResponse())
    default:
        FileHandle.standardError.write(Data(commandUsage().utf8))
        exit(EXIT_FAILURE)
    }
} catch {
    FileHandle.standardError.write(Data(renderedError(error).utf8))
    exit(EXIT_FAILURE)
}
