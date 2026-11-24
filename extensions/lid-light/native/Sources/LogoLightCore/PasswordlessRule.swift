import Foundation

/// An optional sudoers rule that lets one user run exactly the two logo commands
/// without a password, and nothing else.
///
/// Installed to `/etc/sudoers.d/logolight` (validated with `visudo` first), e.g.:
///
///     lee ALL = (root) NOPASSWD: /usr/bin/defaults write com.apple.CoreBrightness LEBacklightMode -int 0, …
public struct PasswordlessRule: Sendable, Equatable {
    public static let path = "/private/etc/sudoers.d/logolight"

    public let userName: String

    public init(userName: String = NSUserName()) throws {
        guard Self.isValidUserName(userName) else { throw LogoLightError.unsupportedUserName(userName) }
        self.userName = userName
    }

    public static var isInstalled: Bool { FileManager.default.fileExists(atPath: path) }

    /// The commands the rule allows: turning the logo off, and back on.
    public static var commands: [PrivilegedCommand] {
        [CoreBrightnessSetting.command(for: .off), CoreBrightnessSetting.command(for: .on)]
    }

    public var lines: [String] {
        [
            "# Installed by LogoLight. Lets \(userName) turn the illuminated Apple logo",
            "# on and off without a password. Delete this file to revoke it.",
            "\(userName) ALL = (root) NOPASSWD: "
                + Self.commands.map(Self.sudoersCommand).joined(separator: ", "),
        ]
    }

    public var contents: String { lines.joined(separator: "\n") + "\n" }

    /// A root shell script that validates the rule with `visudo` and installs it.
    ///
    /// The temporary file is created by root in a private directory, so nothing
    /// can swap it out between validation and installation.
    public var installScript: String {
        let printLines = (["/usr/bin/printf", "'%s\\n'"] + lines.map(Shell.quote)).joined(separator: " ")
        return [
            "umask 077",
            "tmp=$(/usr/bin/mktemp -d /private/tmp/logolight.XXXXXX)",
            "trap '/bin/rm -rf \"$tmp\"' EXIT",
            "\(printLines) > \"$tmp/rule\"",
            "/usr/sbin/visudo -c -q -f \"$tmp/rule\"",
            "/bin/mkdir -p \(Shell.quote((Self.path as NSString).deletingLastPathComponent))",
            "/usr/bin/install -m 0440 -o root -g wheel \"$tmp/rule\" \(Shell.quote(Self.path))",
        ].joined(separator: " && ")
    }

    public static var removeScript: String { "/bin/rm -f \(Shell.quote(path))" }

    /// A root shell script that installs the rule, then runs `command`, so one password dialog does
    /// both. The script's result (exit status and output) is the command's: the install is quiet, and
    /// if it fails the command still runs.
    public func installScript(thenRunning command: PrivilegedCommand) -> String {
        Self.script(installing: installScript, thenRunning: command.shellString)
    }

    /// The install runs in a subshell, so its `umask` and `trap` don't reach the command.
    static func script(installing install: String, thenRunning command: String) -> String {
        "(\(install)) >/dev/null 2>&1; \(command)"
    }

    // MARK: - Helpers

    /// macOS short names: letters, digits, `_`, `.` and `-`, not starting with `-` or a digit.
    static func isValidUserName(_ name: String) -> Bool {
        name.range(of: #"^[A-Za-z_][A-Za-z0-9_.-]{0,254}$"#, options: .regularExpression) != nil
    }

    /// A command in sudoers syntax. `,` `:` `=` and `\` must be escaped in arguments.
    static func sudoersCommand(_ command: PrivilegedCommand) -> String {
        command.argv.map { word in
            word.reduce(into: "") { result, character in
                if ",:=\\".contains(character) { result.append("\\") }
                result.append(character)
            }
        }.joined(separator: " ")
    }
}
