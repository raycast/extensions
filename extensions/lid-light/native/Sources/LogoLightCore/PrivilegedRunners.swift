import Foundation

/// Runs a shell script as root after the user authenticates in the standard macOS dialog.
@MainActor
public protocol AdminShell {
    func run(script: String, prompt: String) throws
}

/// Runs a command through `sudo` without prompting, which only works for commands
/// a sudoers rule marks `NOPASSWD`.
public protocol PasswordlessSudo: Sendable {
    func run(_ command: PrivilegedCommand) async throws
    /// Whether `sudo` would run the command without asking for a password.
    func canRun(_ command: PrivilegedCommand) async -> Bool
}

/// Shows the system administrator dialog via AppleScript's `do shell script … with administrator privileges`.
///
/// It runs in-process (not via `osascript`) so the dialog names this app.
public struct AppleScriptAdminShell: AdminShell {
    public init() {}

    public func run(script: String, prompt: String) throws {
        guard let appleScript = NSAppleScript(source: Self.source(script: script, prompt: prompt)) else {
            throw LogoLightError.commandFailed(exitCode: -1, message: "Couldn't create the AppleScript.")
        }
        var errorInfo: NSDictionary?
        appleScript.executeAndReturnError(&errorInfo)
        guard let errorInfo else { return }

        let number = (errorInfo[NSAppleScript.errorNumber] as? Int) ?? -1
        let message = (errorInfo[NSAppleScript.errorMessage] as? String) ?? ""
        if number == -128 { throw LogoLightError.cancelled } // userCanceledErr
        throw LogoLightError.commandFailed(exitCode: number, message: message)
    }

    static func source(script: String, prompt: String) -> String {
        "do shell script \(literal(script)) with prompt \(literal(prompt)) with administrator privileges"
    }

    /// An AppleScript string literal.
    static func literal(_ string: String) -> String {
        let escaped = string
            .replacingOccurrences(of: "\\", with: "\\\\")
            .replacingOccurrences(of: "\"", with: "\\\"")
        return "\"\(escaped)\""
    }
}

/// `sudo -n`, which fails instead of prompting when a password would be needed.
public struct SudoRunner: PasswordlessSudo {
    static let sudo = "/usr/bin/sudo"

    public init() {}

    public func run(_ command: PrivilegedCommand) async throws {
        let result = await ProcessRunner.run(Self.sudo, ["-n"] + command.argv)
        guard result.status == 0 else {
            throw LogoLightError.commandFailed(exitCode: Int(result.status), message: result.output)
        }
    }

    public func canRun(_ command: PrivilegedCommand) async -> Bool {
        // `sudo -l <command>` exits 0 only if the policy allows it; `-n` keeps it from prompting.
        await ProcessRunner.run(Self.sudo, ["-n", "-l"] + command.argv).status == 0
    }
}

enum ProcessRunner {
    struct Result: Sendable {
        var status: Int32
        var output: String
    }

    /// Runs a program off the main thread and returns its exit status and combined output.
    static func run(_ executable: String, _ arguments: [String]) async -> Result {
        await withCheckedContinuation { continuation in
            DispatchQueue.global(qos: .userInitiated).async {
                let process = Process()
                process.executableURL = URL(fileURLWithPath: executable)
                process.arguments = arguments
                process.standardInput = FileHandle.nullDevice
                let pipe = Pipe()
                process.standardOutput = pipe
                process.standardError = pipe
                do {
                    try process.run()
                } catch {
                    continuation.resume(returning: Result(status: -1, output: error.localizedDescription))
                    return
                }
                let data = pipe.fileHandleForReading.readDataToEndOfFile()
                process.waitUntilExit()
                let output = String(decoding: data, as: UTF8.self)
                    .trimmingCharacters(in: .whitespacesAndNewlines)
                continuation.resume(returning: Result(status: process.terminationStatus, output: output))
            }
        }
    }
}
