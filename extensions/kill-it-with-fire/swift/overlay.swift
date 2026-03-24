/**
 * Kill It With Fire — Native macOS Overlay
 *
 * A minimal Swift CLI that creates a transparent, borderless, always-on-top,
 * click-through window covering the main screen. It loads a WKWebView with the
 * flame animation HTML and auto-terminates after a configurable duration.
 *
 * This binary is compiled by `scripts/build-overlay.sh` and placed at
 * `assets/overlay`. The Raycast command (`src/kill-it-with-fire.tsx`) spawns
 * this binary as a detached child process.
 *
 * Usage:
 *   ./overlay <path-to-flame.html> [duration-seconds]
 *
 * Arguments:
 *   path-to-flame.html  Absolute or relative path to the flame HTML page.
 *   duration-seconds     How long the overlay stays visible (default: 6).
 *
 * Window behaviour:
 *   - Covers the entire main screen
 *   - Fully transparent (no background, no chrome)
 *   - Sits above all other windows (NSWindow.Level.screenSaver)
 *   - Ignores all mouse events (complete click-through)
 *   - Does not appear in the Dock or app switcher
 *   - Auto-terminates after the specified duration
 *
 * Requirements:
 *   - macOS 12+ (Monterey or later)
 *   - Xcode Command Line Tools (for swiftc)
 */

import Cocoa
import WebKit

// ---------------------------------------------------------------------------
// Overlay window controller
// ---------------------------------------------------------------------------

/// Creates and manages the transparent overlay NSWindow and its WKWebView.
class OverlayController: NSObject, WKNavigationDelegate {
    var window: NSWindow!
    var webView: WKWebView!

    /// Display the overlay on screen for the given duration.
    /// - Parameters:
    ///   - htmlPath: File path to the flame HTML page.
    ///   - duration: How long to keep the overlay visible (seconds).
    func show(htmlPath: String, duration: TimeInterval) {
        guard let screen = NSScreen.main else {
            fputs("error: no main screen found\n", stderr)
            NSApplication.shared.terminate(nil)
            return
        }

        let frame = screen.frame

        // Borderless, transparent window — no title bar, no shadow, no chrome.
        window = NSWindow(
            contentRect: frame,
            styleMask: .borderless,
            backing: .buffered,
            defer: false
        )
        window.level = .screenSaver          // above everything
        window.backgroundColor = .clear
        window.isOpaque = false
        window.hasShadow = false
        window.ignoresMouseEvents = true     // click-through
        window.collectionBehavior = [.canJoinAllSpaces, .fullScreenAuxiliary]

        // WebView with transparent background.
        let config = WKWebViewConfiguration()
        webView = WKWebView(frame: frame, configuration: config)
        webView.setValue(false, forKey: "drawsBackground")
        webView.navigationDelegate = self
        window.contentView = webView

        // Load the flame page.
        let fileURL = URL(fileURLWithPath: htmlPath)
        webView.loadFileURL(fileURL, allowingReadAccessTo: fileURL.deletingLastPathComponent())

        window.orderFrontRegardless()

        // Auto-close after the animation duration.
        DispatchQueue.main.asyncAfter(deadline: .now() + duration) {
            self.window.orderOut(nil)
            NSApplication.shared.terminate(nil)
        }
    }
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

let app = NSApplication.shared
app.setActivationPolicy(.accessory)   // no Dock icon, no app-switcher entry

let controller = OverlayController()

// Parse CLI arguments.
let args = CommandLine.arguments
guard args.count > 1 else {
    fputs("usage: overlay <flame.html> [duration-seconds]\n", stderr)
    exit(1)
}

let htmlPath = args[1]
let duration: TimeInterval = args.count > 2
    ? (Double(args[2]) ?? 6.0)
    : 6.0

controller.show(htmlPath: htmlPath, duration: duration)
app.run()
