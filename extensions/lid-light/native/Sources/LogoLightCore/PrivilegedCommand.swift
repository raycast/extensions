import Foundation

/// A command that has to run as root.
public struct PrivilegedCommand: Sendable, Equatable, CustomStringConvertible {
    public var executable: String
    public var arguments: [String]

    public init(executable: String, arguments: [String]) {
        self.executable = executable
        self.arguments = arguments
    }

    public var argv: [String] { [executable] + arguments }

    /// The command as a POSIX shell string, with words quoted where needed.
    public var shellString: String { argv.map(Shell.quote).joined(separator: " ") }

    public var description: String { shellString }
}

/// The setting from Apple's support article "About the illuminated Apple logo"
/// (https://support.apple.com/en-us/149248):
///
///     sudo defaults write com.apple.CoreBrightness LEBacklightMode -int 0   # off
///     sudo defaults delete com.apple.CoreBrightness LEBacklightMode         # back on
public enum CoreBrightnessSetting {
    public static let domain = "com.apple.CoreBrightness"
    public static let key = "LEBacklightMode"
    public static let defaultsTool = "/usr/bin/defaults"

    public static func command(for target: LogoIllumination) -> PrivilegedCommand {
        switch target {
        case .off:
            PrivilegedCommand(executable: defaultsTool, arguments: ["write", domain, key, "-int", "0"])
        case .on:
            PrivilegedCommand(executable: defaultsTool, arguments: ["delete", domain, key])
        }
    }

    /// `defaults delete` fails if the key is already gone, which just means
    /// the logo is already at its default (on).
    public static func isMissingKeyError(_ error: Error) -> Bool {
        guard case let LogoLightError.commandFailed(_, message) = error else { return false }
        let missingKeyMessages = [
            "Could not find key '\(key)'",          // macOS 27
            "Domain '\(domain)' not found",         // macOS 27
            "(\(domain), \(key)) does not exist",   // earlier macOS
            "Domain (\(domain)) not found",         // earlier macOS
        ]
        return missingKeyMessages.contains { message.contains($0) }
    }
}

public enum LogoLightError: Error, Equatable, LocalizedError {
    /// The user dismissed the password dialog.
    case cancelled
    case commandFailed(exitCode: Int, message: String)
    case unsupportedMac
    /// The command ran, but the logo didn't switch to the requested state.
    case notApplied(expected: LogoIllumination)
    case unsupportedUserName(String)
    /// The sudoers rule was installed, but `sudo` still asks for a password.
    case passwordlessRuleNotHonored

    public var errorDescription: String? {
        switch self {
        case .cancelled:
            "The request was cancelled."
        case let .commandFailed(exitCode, message):
            message.isEmpty ? "The command failed with exit code \(exitCode)." : message
        case .unsupportedMac:
            "This Mac doesn't have an illuminated Apple logo. It requires a MacBook Pro with PROLED XDR Display."
        case let .notApplied(expected):
            "The setting was saved, but the logo didn't turn \(expected.rawValue)."
        case let .unsupportedUserName(name):
            "Password-free toggling isn't available for the user name “\(name)”."
        case .passwordlessRuleNotHonored:
            "The password-free rule was installed, but sudo isn't honoring it. Check /etc/sudoers for an #includedir line."
        }
    }
}

enum Shell {
    /// Single-quotes a word for `/bin/sh` unless it's made only of safe characters.
    static func quote(_ word: String) -> String {
        let safe = CharacterSet(charactersIn:
            "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_./=:,+@%")
        if !word.isEmpty, word.unicodeScalars.allSatisfy(safe.contains) { return word }
        return "'" + word.replacingOccurrences(of: "'", with: #"'\''"#) + "'"
    }
}
