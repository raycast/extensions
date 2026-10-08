import Foundation

public protocol CommandRunning: Sendable {
    func run(_ executable: String, arguments: [String], timeoutSeconds: TimeInterval) throws -> String
}

public enum CommandRunnerError: Error, CustomStringConvertible, Sendable {
    case launchFailed(String)
    case timedOut(String)
    case failed(String, Int32, String)

    public var description: String {
        switch self {
        case .launchFailed(let message):
            return message
        case .timedOut(let command):
            return "\(command) timed out"
        case .failed(let command, let code, let output):
            return "\(command) exited with \(code): \(output)"
        }
    }
}

public struct ProcessCommandRunner: CommandRunning {
    public init() {}

    public func run(_ executable: String, arguments: [String], timeoutSeconds: TimeInterval) throws -> String {
        let process = Process()
        let commandDescription = ([executable] + arguments).joined(separator: " ")
        let outputURL = FileManager.default.temporaryDirectory
            .appendingPathComponent("fp-progress-\(UUID().uuidString).log")

        process.executableURL = URL(fileURLWithPath: executable)
        process.arguments = arguments

        FileManager.default.createFile(atPath: outputURL.path, contents: nil)

        guard let outputHandle = try? FileHandle(forWritingTo: outputURL) else {
            throw CommandRunnerError.launchFailed("Failed to create output capture for \(commandDescription)")
        }

        process.standardOutput = outputHandle
        process.standardError = outputHandle

        do {
            try process.run()
        } catch {
            try? outputHandle.close()
            try? FileManager.default.removeItem(at: outputURL)
            throw CommandRunnerError.launchFailed("Failed to launch \(commandDescription): \(error.localizedDescription)")
        }

        let semaphore = DispatchSemaphore(value: 0)
        DispatchQueue.global(qos: .utility).async {
            process.waitUntilExit()
            semaphore.signal()
        }

        if semaphore.wait(timeout: .now() + timeoutSeconds) == .timedOut {
            process.terminate()
            try? outputHandle.close()
            try? FileManager.default.removeItem(at: outputURL)
            throw CommandRunnerError.timedOut(commandDescription)
        }

        try? outputHandle.close()
        let data = (try? Data(contentsOf: outputURL)) ?? Data()
        try? FileManager.default.removeItem(at: outputURL)
        let output = String(data: data, encoding: .utf8) ?? ""

        guard process.terminationStatus == 0 else {
            throw CommandRunnerError.failed(commandDescription, process.terminationStatus, output)
        }

        return output
    }
}
