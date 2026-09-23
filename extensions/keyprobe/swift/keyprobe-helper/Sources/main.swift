import AppKit
import Foundation

/// Standalone helper for KeyProbe.
/// Usage: KeyProbeHelper --pid <path> --log <path> --layout-dir <path> --layout-mode <auto|ansi|jis>

var pidPath: String?
var logPath: String?
var layoutDir: String?
var layoutMode = "auto"

var argi = 1
while argi < CommandLine.arguments.count {
    switch CommandLine.arguments[argi] {
    case "--pid": argi += 1; if argi < CommandLine.arguments.count { pidPath = CommandLine.arguments[argi] }
    case "--log": argi += 1; if argi < CommandLine.arguments.count { logPath = CommandLine.arguments[argi] }
    case "--layout-dir": argi += 1; if argi < CommandLine.arguments.count { layoutDir = CommandLine.arguments[argi] }
    case "--layout-mode": argi += 1; if argi < CommandLine.arguments.count { layoutMode = CommandLine.arguments[argi] }
    default: break
    }
    argi += 1
}

var logHandle: FileHandle?
if let logPath = logPath {
    if !FileManager.default.fileExists(atPath: logPath) {
        FileManager.default.createFile(atPath: logPath, contents: nil)
    }
    logHandle = FileHandle(forWritingAtPath: logPath)
    logHandle?.seekToEndOfFile()
}

func log(_ message: String) {
    let line = "[KeyProbeHelper] \(message)\n"
    logHandle?.write(Data(line.utf8))
}

let pid = ProcessInfo.processInfo.processIdentifier
log("Starting PID=\(pid)")

let app = NSApplication.shared
app.setActivationPolicy(.accessory)

func shutdown() {
    log("Shutting down...")
    EventTap.shared.stop()
    if let pidPath = pidPath {
        try? FileManager.default.removeItem(atPath: pidPath)
    }
    exit(0)
}

// SIGTERM: Raycast (or the user) asked us to quit; SIGINT: Ctrl-C in dev.
let sigTerm = DispatchSource.makeSignalSource(signal: SIGTERM, queue: .main)
sigTerm.setEventHandler { shutdown() }
sigTerm.resume()
signal(SIGTERM, SIG_IGN)

let sigInt = DispatchSource.makeSignalSource(signal: SIGINT, queue: .main)
sigInt.setEventHandler { shutdown() }
sigInt.resume()
signal(SIGINT, SIG_IGN)

// Closing the window calls NSApp.terminate directly (see Window.swift), which
// bypasses the SIGTERM path above — this delegate makes sure the tap still
// gets stopped and the PID file still gets removed either way.
final class AppDelegate: NSObject, NSApplicationDelegate {
    func applicationWillTerminate(_ notification: Notification) {
        log("applicationWillTerminate")
        EventTap.shared.stop()
        if let pidPath = pidPath {
            try? FileManager.default.removeItem(atPath: pidPath)
        }
    }
}

let appDelegate = AppDelegate()
app.delegate = appDelegate

// SIGUSR1: an already-running instance was asked to open again -> focus.
let sigUsr1 = DispatchSource.makeSignalSource(signal: SIGUSR1, queue: .main)
sigUsr1.setEventHandler {
    log("Focus requested via SIGUSR1")
    KeyProbeWindowController.shared.bringToFront()
}
sigUsr1.resume()
signal(SIGUSR1, SIG_IGN)

guard let layoutDir = layoutDir else {
    log("Missing --layout-dir")
    exit(1)
}
let layoutPath = LayoutSelector.resolve(mode: layoutMode, layoutDir: layoutDir)
guard let layout = Layout.load(from: layoutPath) else {
    log("Failed to load layout from \(layoutPath)")
    exit(1)
}
log("Loaded layout: \(layoutPath) (mode=\(layoutMode))")

if !EventTap.shared.start(onActivity: { activity in
    log(activity.logLine)
    if activity.isDown {
        KeyProbeWindowController.shared.handleDown(keycode: activity.keycode)
    } else {
        KeyProbeWindowController.shared.handleUp(keycode: activity.keycode)
    }
}) {
    log("Failed to create event tap — Input Monitoring permission not granted.")
    if let pidPath = pidPath {
        try? FileManager.default.removeItem(atPath: pidPath)
    }
    exit(1)
}

KeyProbeWindowController.shared.show(layout: layout)

// PID file is written only after the tap + window are ready, so the Raycast
// side never treats an early/failed startup as success.
if let pidPath = pidPath {
    try? String(pid).write(toFile: pidPath, atomically: true, encoding: .utf8)
}
log("Ready (PID=\(pid))")

app.run()
