import AppKit
import Foundation
import RaycastSwiftMacros

// Functions exported to the TypeScript side of the extension.

enum ReaderError: LocalizedError {
    case launchFailed(Int32)

    var errorDescription: String? {
        switch self {
        case let .launchFailed(code): return "Couldn't open the reader window (error \(code))"
        }
    }
}

/// Opens the floating reader for the text in `textFile` and returns straight away.
///
/// The window runs in its own detached copy of this program (via `showReader`), so the
/// Raycast command can finish immediately while reading continues in the background.
@raycast func speak(textFile: String, voice: String, rate: String, tableHeaders: Bool) throws {
    let executable = Bundle.main.executablePath ?? CommandLine.arguments[0]
    let encoder = JSONEncoder()
    func json(_ value: some Encodable) -> String {
        String(decoding: (try? encoder.encode(value)) ?? Data("\"\"".utf8), as: UTF8.self)
    }
    let args = [executable, "showReader", json(textFile), json(voice), json(rate), json(tableHeaders)]

    var attributes: posix_spawnattr_t?
    posix_spawnattr_init(&attributes)
    defer { posix_spawnattr_destroy(&attributes) }
    // New session: the reader isn't tied to Raycast's command process.
    posix_spawnattr_setflags(&attributes, Int16(POSIX_SPAWN_SETSID))

    var fileActions: posix_spawn_file_actions_t?
    posix_spawn_file_actions_init(&fileActions)
    defer { posix_spawn_file_actions_destroy(&fileActions) }
    posix_spawn_file_actions_addopen(&fileActions, 0, "/dev/null", O_RDONLY, 0)
    posix_spawn_file_actions_addopen(&fileActions, 1, "/dev/null", O_WRONLY, 0)
    posix_spawn_file_actions_addopen(&fileActions, 2, "/dev/null", O_WRONLY, 0)

    var argv: [UnsafeMutablePointer<CChar>?] = args.map { strdup($0) } + [nil]
    defer { argv.forEach { free($0) } }

    var pid: pid_t = 0
    let status = posix_spawn(&pid, executable, &fileActions, &attributes, &argv, environ)
    if status != 0 { throw ReaderError.launchFailed(status) }
}

/// Runs the reader window (called by `speak` in a separate process). Exits when the window closes.
@raycast func showReader(textFile: String, voice: String, rate: String, tableHeaders: Bool) {
    runReader(textPath: textFile, voice: voice, rate: rate, tableHeaders: tableHeaders, deleteInput: true)
}
