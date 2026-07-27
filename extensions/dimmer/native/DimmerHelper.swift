import AppKit
import Darwin
import Foundation

private struct DimState: Decodable {
    let enabled: Bool
    let level: Int
}

@MainActor
private final class DimmerController: NSObject, NSApplicationDelegate {
    private let stateURL: URL
    private let lockURL: URL
    private var lockDescriptor: Int32 = -1
    private var timer: Timer?
    private var shutdownTimer: Timer?
    private var windows: [NSWindow] = []
    private var currentLevel = -1
    private var signalSource: DispatchSourceSignal?

    init(stateURL: URL) {
        self.stateURL = stateURL
        self.lockURL = stateURL.deletingPathExtension().appendingPathExtension("lock")
        super.init()
    }

    func applicationDidFinishLaunching(_ notification: Notification) {
        guard acquireLock() else {
            NSApp.terminate(nil)
            return
        }

        NSApp.setActivationPolicy(.accessory)
        observeTerminationSignal()

        NotificationCenter.default.addObserver(
            self,
            selector: #selector(screenConfigurationChanged),
            name: NSApplication.didChangeScreenParametersNotification,
            object: nil
        )

        refresh()
        timer = Timer.scheduledTimer(withTimeInterval: 0.15, repeats: true) { [weak self] _ in
            MainActor.assumeIsolated {
                self?.refresh()
            }
        }
    }

    func applicationWillTerminate(_ notification: Notification) {
        timer?.invalidate()
        shutdownTimer?.invalidate()
        signalSource?.cancel()
        removeOverlays()
        releaseLock()
    }

    @objc private func screenConfigurationChanged() {
        rebuildOverlays(level: currentLevel)
    }

    private func refresh() {
        guard
            let data = try? Data(contentsOf: stateURL),
            let state = try? JSONDecoder().decode(DimState.self, from: data)
        else {
            scheduleShutdown()
            return
        }

        guard state.enabled, state.level > 0 else {
            removeOverlays()
            currentLevel = 0
            scheduleShutdown()
            return
        }

        shutdownTimer?.invalidate()
        shutdownTimer = nil
        let level = max(0, min(90, state.level))
        if level != currentLevel || windows.count != NSScreen.screens.count {
            rebuildOverlays(level: level)
        }
    }

    private func rebuildOverlays(level: Int) {
        removeOverlays()
        currentLevel = level

        guard level > 0 else { return }
        let opacity = CGFloat(level) / 100.0

        windows = NSScreen.screens.map { screen in
            let window = NSWindow(
                contentRect: screen.frame,
                styleMask: .borderless,
                backing: .buffered,
                defer: false,
                screen: screen
            )
            window.backgroundColor = .black
            window.alphaValue = opacity
            window.isOpaque = false
            window.hasShadow = false
            window.ignoresMouseEvents = true
            window.level = .floating
            window.collectionBehavior = [
                .canJoinAllSpaces,
                .fullScreenAuxiliary,
                .stationary,
                .ignoresCycle,
            ]
            window.animationBehavior = .none
            window.sharingType = .none
            window.orderFrontRegardless()
            return window
        }
    }

    private func removeOverlays() {
        windows.forEach { $0.orderOut(nil) }
        windows.removeAll()
    }

    private func scheduleShutdown() {
        guard shutdownTimer == nil else { return }
        shutdownTimer = Timer.scheduledTimer(withTimeInterval: 1.0, repeats: false) { _ in
            NSApp.terminate(nil)
        }
    }

    private func acquireLock() -> Bool {
        let descriptor = open(lockURL.path, O_RDWR | O_CREAT, S_IRUSR | S_IWUSR)
        guard descriptor >= 0 else { return false }
        guard flock(descriptor, LOCK_EX | LOCK_NB) == 0 else {
            close(descriptor)
            return false
        }

        lockDescriptor = descriptor
        _ = ftruncate(descriptor, 0)
        let contents = "\(getpid())\n"
        contents.withCString { pointer in
            _ = write(descriptor, pointer, strlen(pointer))
        }
        _ = fsync(descriptor)
        return true
    }

    private func releaseLock() {
        guard lockDescriptor >= 0 else { return }
        _ = flock(lockDescriptor, LOCK_UN)
        close(lockDescriptor)
        lockDescriptor = -1
    }

    private func observeTerminationSignal() {
        signal(SIGTERM, SIG_IGN)
        let source = DispatchSource.makeSignalSource(signal: SIGTERM, queue: .main)
        source.setEventHandler {
            NSApp.terminate(nil)
        }
        source.resume()
        signalSource = source
    }
}

@main
private enum DimmerHelper {
    @MainActor
    static func main() {
        guard
            let stateIndex = CommandLine.arguments.firstIndex(of: "--state"),
            CommandLine.arguments.indices.contains(stateIndex + 1)
        else {
            FileHandle.standardError.write(Data("Usage: dimmer-helper --state <path>\n".utf8))
            exit(64)
        }

        let application = NSApplication.shared
        let controller = DimmerController(
            stateURL: URL(fileURLWithPath: CommandLine.arguments[stateIndex + 1])
        )
        application.delegate = controller
        application.run()
    }
}
