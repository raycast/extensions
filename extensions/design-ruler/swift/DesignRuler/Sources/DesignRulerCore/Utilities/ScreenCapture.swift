import AppKit
import ScreenCaptureKit

/// Shared screen capture utility returning CGImages.
/// Used by both Measure (images wrapped into ColorMap) and AlignmentGuides (background only).
package enum ScreenCapture {
    /// Capture every screen in `screens`, returning one image per screen in the same order
    /// (nil where that screen could not be captured).
    ///
    /// Concurrent per-screen ScreenCaptureKit screenshots. Blocks the calling thread until done,
    /// capped at 5 seconds for the whole batch so a stalled ScreenCaptureKit (e.g. system under
    /// load) can't freeze launch; screens not captured by then come back nil.
    package static func captureScreens(_ screens: [NSScreen]) -> [CGImage?] {
        // Read AppKit state here on the calling (main) thread; the capture task runs off-main.
        let targets: [Target?] = screens.map { screen in
            guard let number = screen.deviceDescription[NSDeviceDescriptionKey("NSScreenNumber")] as? NSNumber else { return nil }
            return Target(displayID: number.uint32Value, scale: Int(screen.backingScaleFactor),
                          rect: CoordinateConverter.appKitRectToCG(screen.frame))
        }
        let results = CaptureResults(count: screens.count)
        let semaphore = DispatchSemaphore(value: 0)

        // Detached: the calling thread is blocked on the semaphore, so the task must never
        // need the main actor. userInitiated: the (user-interactive) main thread is waiting on it.
        Task.detached(priority: .userInitiated) {
            defer { semaphore.signal() }
            // Before macOS 15.2 each screen needs its display from one shareable-content query
            let displays: [SCDisplay]
            if #available(macOS 15.2, *) {
                displays = []
            } else {
                guard let content = try? await SCShareableContent.excludingDesktopWindows(false, onScreenWindowsOnly: true) else { return }
                displays = content.displays
            }
            await withTaskGroup(of: (Int, CGImage?).self) { group in
                for (index, target) in targets.enumerated() {
                    guard let target else { continue }
                    group.addTask { (index, await capture(target, displays: displays)) }
                }
                for await result in group {
                    results.set(result.0, result.1)
                }
            }
        }

        _ = semaphore.wait(timeout: .now() + 5)
        return results.snapshot()
    }

    private struct Target {
        let displayID: CGDirectDisplayID
        let scale: Int
        let rect: CGRect    // CG global coords, what captureImage(in:) takes
    }

    /// One screen as it looks, without the cursor. macOS 15.2+ captures the screen's rect, which
    /// matches screencapture. A display filter leaves out window shadows and the menu bar's backdrop
    /// (macOS 26/27, whatever `ignoreShadowsDisplay` says), so it's only the fallback.
    private static func capture(_ target: Target, displays: [SCDisplay]) async -> CGImage? {
        if #available(macOS 15.2, *) {
            return try? await SCScreenshotManager.captureImage(in: target.rect)
        }
        guard let display = displays.first(where: { $0.displayID == target.displayID }) else { return nil }
        let filter = SCContentFilter(display: display, excludingApplications: [], exceptingWindows: [])
        let config = SCStreamConfiguration()
        config.width = display.width * target.scale
        config.height = display.height * target.scale
        config.showsCursor = false
        return try? await SCScreenshotManager.captureImage(contentFilter: filter, configuration: config)
    }
}

/// Lock-protected result slots. After a timeout the capture task may still finish and write
/// here; nobody reads it any more, but the lock keeps that late write race-free.
private final class CaptureResults: @unchecked Sendable {
    private let lock = NSLock()
    private var images: [CGImage?]

    init(count: Int) {
        images = Array(repeating: nil, count: count)
    }

    func set(_ index: Int, _ image: CGImage?) {
        lock.lock()
        images[index] = image
        lock.unlock()
    }

    func snapshot() -> [CGImage?] {
        lock.lock()
        defer { lock.unlock() }
        return images
    }
}
