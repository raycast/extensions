import ApplicationServices
import Foundation

/// AX notifications for the focused app: which window has focus, and moves, resizes and closes of
/// the window the stage is built around. Event-driven, nothing polls.
final class WindowWatcher {
    enum Event {
        case focusChanged
        case frameChanged
        case windowDestroyed(AXUIElement)
    }

    private static let windowNotifications = [
        kAXMovedNotification, kAXResizedNotification, kAXUIElementDestroyedNotification,
    ]

    private let observer: AXObserver
    private let app: AXUIElement
    private let handler: (Event) -> Void
    private var window: AXUIElement?
    private var refcon: UnsafeMutableRawPointer { Unmanaged.passUnretained(self).toOpaque() }

    /// The owner must call `stop()` before releasing the watcher; AX holds an unretained pointer to it.
    init?(pid: pid_t, handler: @escaping (Event) -> Void) {
        var created: AXObserver?
        let callback: AXObserverCallback = { _, element, notification, refcon in
            guard let refcon else { return }
            Unmanaged<WindowWatcher>.fromOpaque(refcon).takeUnretainedValue()
                .handle(notification as String, element)
        }
        guard AXObserverCreate(pid, callback, &created) == .success, let created else { return nil }
        observer = created
        app = AXUIElementCreateApplication(pid)
        self.handler = handler

        CFRunLoopAddSource(CFRunLoopGetMain(), AXObserverGetRunLoopSource(observer), .commonModes)
        AXObserverAddNotification(observer, app, kAXFocusedWindowChangedNotification as CFString, refcon)
    }

    func watch(_ window: AXUIElement?) {
        if let old = self.window {
            for name in Self.windowNotifications {
                AXObserverRemoveNotification(observer, old, name as CFString)
            }
        }
        self.window = window
        if let window {
            for name in Self.windowNotifications {
                AXObserverAddNotification(observer, window, name as CFString, refcon)
            }
        }
    }

    func stop() {
        watch(nil)
        AXObserverRemoveNotification(observer, app, kAXFocusedWindowChangedNotification as CFString)
        CFRunLoopRemoveSource(CFRunLoopGetMain(), AXObserverGetRunLoopSource(observer), .commonModes)
    }

    private func handle(_ notification: String, _ element: AXUIElement) {
        switch notification {
        case kAXFocusedWindowChangedNotification: handler(.focusChanged)
        case kAXMovedNotification, kAXResizedNotification: handler(.frameChanged)
        case kAXUIElementDestroyedNotification: handler(.windowDestroyed(element))
        default: break
        }
    }
}
