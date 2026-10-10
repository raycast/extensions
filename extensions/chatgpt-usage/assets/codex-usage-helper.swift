import Darwin
import Foundation

// Canceling the host's buffered execFile must also stop the Codex child, not orphan it.
nonisolated(unsafe) private var activeServerPID: pid_t = 0

private func stopOnSignal(_ value: Int32) {
    if activeServerPID > 0 { Darwin.kill(activeServerPID, SIGKILL) }
    _exit(128 + value)
}

private struct UsageError: Error {
    let message: String
    init(_ message: String) { self.message = message }
}

private func readUsage(executable: String, arguments: [String], timeoutMs: Double) throws -> [String: Any] {
    let server = Process()
    let input = Pipe()
    let output = Pipe()
    server.executableURL = URL(fileURLWithPath: executable)
    server.arguments = arguments
    server.currentDirectoryURL = FileManager.default.homeDirectoryForCurrentUser
    server.environment = ProcessInfo.processInfo.environment
    server.standardInput = input
    server.standardOutput = output
    // Do not forward Codex diagnostics or account responses into extension logs.
    server.standardError = FileHandle.nullDevice

    do { try server.run() }
    catch { throw UsageError("Could not start Codex. Check the executable path and your installation.") }
    activeServerPID = server.processIdentifier
    _ = fcntl(input.fileHandleForWriting.fileDescriptor, F_SETNOSIGPIPE, 1)

    defer {
        try? input.fileHandleForWriting.close()
        if server.isRunning {
            server.terminate()
            let deadline = Date().addingTimeInterval(1)
            while server.isRunning && Date() < deadline { usleep(10000) }
            if server.isRunning { Darwin.kill(server.processIdentifier, SIGKILL) }
        }
        server.waitUntilExit()
        activeServerPID = 0
        try? output.fileHandleForReading.close()
    }

    func send(_ message: [String: Any]) throws {
        var data = try JSONSerialization.data(withJSONObject: message)
        data.append(10)
        do { try input.fileHandleForWriting.write(contentsOf: data) }
        catch { throw UsageError("The Codex connection closed before usage could be read.") }
    }

    try send([
        "id": 1, "method": "initialize",
        "params": ["clientInfo": [
            "name": "raycast_chatgpt_usage", "title": "ChatGPT Usage", "version": "1.0.0"
        ]]
    ])

    let deadline = ProcessInfo.processInfo.systemUptime + timeoutMs / 1000
    let descriptor = output.fileHandleForReading.fileDescriptor
    var buffer = Data()
    var expectedID = 1
    var planType: String?

    while true {
        let remaining = deadline - ProcessInfo.processInfo.systemUptime
        guard remaining > 0 else {
            throw UsageError("Codex usage request timed out. Check your connection and try refreshing.")
        }
        var event = pollfd(fd: descriptor, events: Int16(POLLIN), revents: 0)
        let ready = Darwin.poll(&event, 1, Int32(min(remaining * 1000, 1000).rounded(.up)))
        if ready < 0 {
            if errno == EINTR { continue }
            throw UsageError("The Codex connection closed before usage could be read.")
        }
        if ready == 0 { continue }

        var bytes = [UInt8](repeating: 0, count: 8192)
        let count = Darwin.read(descriptor, &bytes, bytes.count)
        if count < 0 {
            if errno == EINTR { continue }
            throw UsageError("The Codex connection closed before usage could be read.")
        }
        guard count > 0 else {
            throw UsageError("Codex exited before returning usage. Try updating Codex and run codex login.")
        }
        buffer.append(contentsOf: bytes.prefix(count))
        guard buffer.count <= 1024 * 1024 else {
            throw UsageError("Codex returned an unexpectedly large usage response.")
        }

        while let newline = buffer.firstIndex(of: 10) {
            let line = Data(buffer[..<newline])
            buffer.removeSubrange(...newline)
            if line.isEmpty { continue }
            guard let decoded = try? JSONSerialization.jsonObject(with: line),
                  let message = decoded as? [String: Any] else {
                throw UsageError("Codex returned invalid protocol data. Try updating Codex.")
            }
            guard (message["id"] as? Int) == expectedID else { continue }
            if message["error"] != nil {
                throw UsageError(expectedID == 1
                    ? "Could not initialize Codex App Server. Try updating Codex."
                    : "Could not read subscription usage. Check your connection and run codex login if your session expired.")
            }
            guard let result = message["result"] as? [String: Any] else {
                throw UsageError("Codex returned an invalid usage response. Try updating Codex.")
            }
            switch expectedID {
            case 1:
                expectedID = 2
                try send(["method": "initialized", "params": [:]])
                try send(["id": 2, "method": "account/read", "params": ["refreshToken": false]])
            case 2:
                guard let account = result["account"] as? [String: Any], account["type"] as? String == "chatgpt" else {
                    throw UsageError("Run codex login and sign in with ChatGPT. An API key cannot read subscription limits.")
                }
                planType = account["planType"] as? String
                expectedID = 3
                try send(["id": 3, "method": "account/rateLimits/read"])
            default:
                return ["payload": result, "planType": planType as Any? ?? NSNull()]
            }
        }
    }
}

private func writeJSON(_ value: [String: Any]) {
    guard var data = try? JSONSerialization.data(withJSONObject: value, options: [.sortedKeys]) else { exit(1) }
    data.append(10)
    FileHandle.standardOutput.write(data)
}

signal(SIGPIPE, SIG_IGN)
signal(SIGTERM, stopOnSignal)
signal(SIGINT, stopOnSignal)

let args = Array(CommandLine.arguments.dropFirst())
guard args.count >= 2, let timeoutMs = Double(args[1]), timeoutMs > 0, timeoutMs.isFinite else {
    writeJSON(["error": "Usage: codex-usage-helper <codex-path> <timeout-ms> [app-server arguments]"])
    exit(1)
}
do {
    let arguments = args.count > 2 ? Array(args.dropFirst(2)) : ["app-server"]
    writeJSON(try readUsage(executable: args[0], arguments: arguments, timeoutMs: timeoutMs))
} catch let error as UsageError {
    writeJSON(["error": error.message])
    exit(1)
} catch {
    writeJSON(["error": "Could not read subscription usage. Try updating Codex."])
    exit(1)
}
