import AppKit
import Foundation
import RaycastSwiftMacros

/// Called from Raycast. The generated entry point waits for this process to
/// exit before resolving the TypeScript promise, so the long-lived panel runs
/// in a detached copy of this executable (`runPanel`) and this returns right
/// away. Readiness is signalled through the PID file, as before.
@raycast func openPanel(layoutDir: String, layoutMode: String, pidPath: String, logPath: String) throws {
    // The generated entry point decodes every argument as JSON.
    let encode = { (value: String) throws -> String in
        String(decoding: try JSONEncoder().encode(value), as: UTF8.self)
    }
    let worker = Process()
    worker.executableURL = Bundle.main.executableURL ?? URL(fileURLWithPath: CommandLine.arguments[0])
    worker.arguments = ["runPanel"] + (try [layoutDir, layoutMode, pidPath, logPath].map(encode))
    worker.standardInput = FileHandle.nullDevice
    // Anything the worker prints (a crash report, say) lands in the log
    // rather than nowhere. It must not inherit our stdout: Raycast reads
    // this function's result from it.
    let log = Panel.openLog(at: logPath) ?? FileHandle.nullDevice
    worker.standardOutput = log
    worker.standardError = log
    try worker.run()
}

/// The panel process itself: single-instance lock, signals, event tap and
/// window. Never returns.
@raycast func runPanel(layoutDir: String, layoutMode: String, pidPath: String, logPath: String) async {
    // Out of Raycast's process group, as the old `spawn(..., { detached: true })`
    // did, so the panel outlives the command that opened it.
    setsid()
    // AppKit is started from a run loop callout, not from a main-actor job:
    // a run loop spun inside a main-queue job never lets other main-queue
    // work run, which silently disabled the signal handlers below.
    CFRunLoopPerformBlock(CFRunLoopGetMain(), CFRunLoopMode.commonModes.rawValue) {
        Panel(pidPath: pidPath, logPath: logPath).run(layoutDir: layoutDir, layoutMode: layoutMode)
    }
    CFRunLoopWakeUp(CFRunLoopGetMain())
    // Suspend for good, handing the main thread back to its run loop.
    await withUnsafeContinuation { (_: UnsafeContinuation<Void, Never>) in }
}

private final class Panel: NSObject, NSApplicationDelegate {
    private let pidPath: String
    private let logHandle: FileHandle?
    private var signalSources: [DispatchSourceSignal] = []

    // O_APPEND, not seek-to-end: a second launch, its worker's stdout and the
    // running panel can all write at once, and a seeked handle overwrites the
    // others' lines (including the permission line helper.ts looks for).
    static func openLog(at path: String) -> FileHandle? {
        let fd = open(path, O_WRONLY | O_APPEND | O_CREAT, 0o644)
        return fd >= 0 ? FileHandle(fileDescriptor: fd, closeOnDealloc: true) : nil
    }

    init(pidPath: String, logPath: String) {
        self.pidPath = pidPath
        self.logHandle = Self.openLog(at: logPath)
        super.init()
    }

    private func log(_ message: String) {
        logHandle?.write(Data("[keyprobe-helper] \(message)\n".utf8))
    }

    func run(layoutDir: String, layoutMode: String) -> Never {
        let pid = ProcessInfo.processInfo.processIdentifier
        log("Starting PID=\(pid)")

        // The PID file only appears once the window is ready, so it can't stop
        // a second launch racing the first (a double-pressed shortcut). This
        // lock is claimed before anything is shown, and the kernel releases it
        // when the process dies, SIGKILL included, so it can't go stale.
        // Retried briefly because a layout restart can launch us between the
        // old helper removing its PID file and actually exiting.
        let lockFD = open(pidPath + ".lock", O_RDWR | O_CREAT, 0o644)
        if lockFD >= 0 {
            var claimed = false
            for _ in 0..<20 {
                if flock(lockFD, LOCK_EX | LOCK_NB) == 0 {
                    claimed = true
                    break
                }
                usleep(50_000)
            }
            if !claimed {
                log("Another instance holds the lock, exiting")
                exit(0)
            }
            // lockFD is deliberately never closed: the lock lives as long as we do.
        } else {
            log("Could not open lock file (errno=\(errno)), continuing without it")
        }

        let app = NSApplication.shared
        app.setActivationPolicy(.accessory)
        // Closing the window calls NSApp.terminate directly (see Window.swift),
        // which bypasses the signal handlers below — applicationWillTerminate
        // makes sure the tap is still stopped and the PID file removed.
        app.delegate = self

        // SIGTERM: Raycast asked us to quit (layout restart); SIGINT: Ctrl-C
        // when run by hand.
        observe(SIGTERM) { [unowned self] in self.shutdown() }
        observe(SIGINT) { [unowned self] in self.shutdown() }
        // SIGUSR1: Open KeyProbe ran again while we're up -> focus.
        observe(SIGUSR1) { [unowned self] in
            self.log("Focus requested via SIGUSR1")
            KeyProbeWindowController.shared.bringToFront()
        }

        let layoutPath = LayoutSelector.resolve(mode: layoutMode, layoutDir: layoutDir)
        guard let layout = Layout.load(from: layoutPath) else {
            log("Failed to load layout from \(layoutPath)")
            exit(1)
        }
        log("Loaded layout: \(layoutPath) (mode=\(layoutMode))")

        // Keystrokes are deliberately never logged: the tap is session-wide, so
        // they'd include typing in other apps (passwords too) while we're open.
        if !EventTap.shared.start(onActivity: { activity in
            if activity.isDown {
                KeyProbeWindowController.shared.handleDown(keycode: activity.keycode)
            } else {
                KeyProbeWindowController.shared.handleUp(keycode: activity.keycode)
            }
        }) {
            // helper.ts matches "Input Monitoring permission not granted" to point
            // the user at the right settings pane; keep that phrase intact.
            log("Failed to create event tap — Input Monitoring permission not granted.")
            removePIDFile()
            exit(1)
        }

        KeyProbeWindowController.shared.show(layout: layout)

        // Written only after the tap + window are ready, so the Raycast side
        // never treats an early/failed startup as success.
        try? String(pid).write(toFile: pidPath, atomically: true, encoding: .utf8)
        log("Ready (PID=\(pid))")

        app.run()
        exit(0)
    }

    func applicationWillTerminate(_ notification: Notification) {
        log("applicationWillTerminate")
        EventTap.shared.stop()
        removePIDFile()
    }

    private func observe(_ signalNumber: Int32, handler: @escaping () -> Void) {
        signal(signalNumber, SIG_IGN)
        let source = DispatchSource.makeSignalSource(signal: signalNumber, queue: .main)
        source.setEventHandler(handler: handler)
        source.resume()
        signalSources.append(source)
    }

    private func shutdown() {
        log("Shutting down...")
        EventTap.shared.stop()
        removePIDFile()
        exit(0)
    }

    private func removePIDFile() {
        try? FileManager.default.removeItem(atPath: pidPath)
    }
}
