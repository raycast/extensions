import AppKit
import Foundation

/// Standalone helper binary for Keyraycast.
/// Usage: KeyraycastHelper --config <path> --pid <path> --log <path>
/// Reads config JSON from file, starts overlay + event tap, runs until SIGTERM.

struct Config: Decodable {
    let displayMode: String
    let position: String
    let displayDuration: Double
    let fontSize: String
    let showMouseClicks: Bool
    let appearance: String
    let uppercaseKeys: Bool
    let showSpaceSymbol: Bool
}

// Parse arguments
var configPath: String?
var pidPath: String?
var logPath: String?

var i = 1
while i < CommandLine.arguments.count {
    switch CommandLine.arguments[i] {
    case "--config": i += 1; if i < CommandLine.arguments.count { configPath = CommandLine.arguments[i] }
    case "--pid":    i += 1; if i < CommandLine.arguments.count { pidPath = CommandLine.arguments[i] }
    case "--log":    i += 1; if i < CommandLine.arguments.count { logPath = CommandLine.arguments[i] }
    default: break
    }
    i += 1
}

// Logging
var logHandle: FileHandle?
if let logPath = logPath {
    FileManager.default.createFile(atPath: logPath, contents: nil)
    logHandle = FileHandle(forWritingAtPath: logPath)
}

func log(_ message: String) {
    let line = "[KeyraycastHelper] \(message)\n"
    logHandle?.seekToEndOfFile()
    logHandle?.write(Data(line.utf8))
}

guard let configPath = configPath,
      let configData = FileManager.default.contents(atPath: configPath),
      let config = try? JSONDecoder().decode(Config.self, from: configData) else {
    log("Failed to read config")
    exit(1)
}

let pid = ProcessInfo.processInfo.processIdentifier
log("Starting PID=\(pid)")

// NSApplication setup
let app = NSApplication.shared
app.setActivationPolicy(.accessory)

// Graceful shutdown via SIGTERM/SIGINT
func shutdown() {
    log("Shutting down...")
    EventTap.shared.stop()
    KeystrokeOverlay.shared.hide()
    if let pidPath = pidPath {
        try? FileManager.default.removeItem(atPath: pidPath)
    }
    exit(0)
}

let sigTerm = DispatchSource.makeSignalSource(signal: SIGTERM, queue: .main)
sigTerm.setEventHandler { shutdown() }
sigTerm.resume()
signal(SIGTERM, SIG_IGN)

let sigInt = DispatchSource.makeSignalSource(signal: SIGINT, queue: .main)
sigInt.setEventHandler { shutdown() }
sigInt.resume()
signal(SIGINT, SIG_IGN)

// Start overlay and event tap
KeystrokeOverlay.shared.showSync(
    position: config.position,
    fontSize: config.fontSize,
    displayDuration: config.displayDuration,
    appearance: config.appearance
)

let success = EventTap.shared.start(
    displayMode: config.displayMode,
    showMouseClicks: config.showMouseClicks,
    uppercaseKeys: config.uppercaseKeys,
    showSpaceSymbol: config.showSpaceSymbol
) { text, isCommand in
    KeystrokeOverlay.shared.displayKeystroke(text, isCommand: isCommand)
}

if !success {
    log("Failed to create event tap — check Accessibility permissions")
    if let pidPath = pidPath {
        try? FileManager.default.removeItem(atPath: pidPath)
    }
    exit(1)
}

// PID file is written only after overlay + event tap are ready so clients don't treat early startup as success.
if let pidPath = pidPath {
    try? String(pid).write(toFile: pidPath, atomically: true, encoding: .utf8)
}
log("Overlay active (PID=\(pid))")
app.run()
