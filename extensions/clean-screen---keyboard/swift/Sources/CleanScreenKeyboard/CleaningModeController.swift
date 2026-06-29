import AppKit
import CoreGraphics
import Foundation

/// Borderless overlay window. `NSWindow` won't become key by default with the
/// `.borderless` style mask, so we override `canBecomeKey`/`canBecomeMain` to
/// enable the "safe" level of keyboard blocking (dev-docs.md §13.3, level 1):
/// a `.screenSaver`-level *key* window swallows most keystrokes on its own,
/// before any CGEvent tap is considered.
final class OverlayWindow: NSWindow {
  override var canBecomeKey: Bool { true }
  override var canBecomeMain: Bool { true }

  // Never let AppKit shift or shrink the overlay to avoid the menu bar — we
  // intentionally cover each screen edge-to-edge, including secondary displays.
  override func constrainFrameRect(_ frameRect: NSRect, to screen: NSScreen?) -> NSRect {
    frameRect
  }
}

/// CGEvent tap callback. Returning `nil` *consumes* the event so it never
/// reaches any application — this is the strong, system-wide keyboard block
/// (dev-docs.md §13.3, level 2), and it REQUIRES the Accessibility permission
/// granted to the Raycast app. Without that permission `CGEvent.tapCreate`
/// returns nil and we silently fall back to the key-window block above.
///
/// This must be a bare C function pointer (no captured context), so teardown
/// is handled by the controller that owns the tap, not from here.
private let keyboardSuppressingTapCallback: CGEventTapCallBack = { _, type, event, _ in
  // If the system disables the tap (timeout / heavy input), pass the event
  // through rather than swallow it; the controller re-enables on next launch.
  if type == .tapDisabledByTimeout || type == .tapDisabledByUserInput {
    return Unmanaged.passUnretained(event)
  }
  return nil  // swallow keyDown / keyUp / flagsChanged
}

/// Owns the fullscreen blackout overlay and the keyboard-suppressing event tap
/// for one "cleaning mode" session. All AppKit/CoreGraphics work is main-actor
/// isolated.
///
/// Lifecycle (dev-docs.md §13.3): a Raycast Swift command is a plain executable
/// with no app bundle and no ambient AppKit run loop, so we bootstrap
/// `NSApplication` and run the event loop ourselves. `run()` blocks on
/// `NSApp.run()` until the centered button stops it — that blocking call is the
/// "owned run loop" that keeps the overlay alive after the short-lived JS call
/// has handed off.
@MainActor
final class CleaningModeController {
  private var windows: [NSWindow] = []
  private var eventTap: CFMachPort?
  private var runLoopSource: CFRunLoopSource?

  /// Presents the overlay and blocks until the user clicks "Done". Returns
  /// (restoring the screen + keyboard) only after the event loop is stopped.
  static func run() {
    let app = NSApplication.shared
    // `.accessory`: show overlay windows with no Dock icon / app-switcher entry,
    // while still allowing a key window. (`NSApp` itself is nil until `.shared`
    // is accessed — accessing it here is what bootstraps AppKit.)
    app.setActivationPolicy(.accessory)

    // Local strong reference kept across `app.run()` so the controller — and
    // thus the button's (weak) target — stays alive for the whole session.
    let controller = CleaningModeController()
    controller.present()
    app.activate(ignoringOtherApps: true)

    app.run()  // blocks; `handleDismiss` calls `NSApp.stop(_:)` to return here

    controller.teardown()
  }

  // MARK: - Presentation

  private func present() {
    installEventTap()

    // The primary display sits at the coordinate-space origin in AppKit; put
    // the single dismiss button there.
    let primary =
      NSScreen.screens.first(where: { $0.frame.origin == .zero }) ?? NSScreen.main ?? NSScreen.screens.first

    for screen in NSScreen.screens {
      windows.append(makeOverlay(for: screen, showsButton: screen === primary))
    }
  }

  private func makeOverlay(for screen: NSScreen, showsButton: Bool) -> NSWindow {
    let window = OverlayWindow(
      contentRect: screen.frame,
      styleMask: .borderless,
      backing: .buffered,
      defer: false
    )
    // Place the window exactly over its screen in the global coordinate space.
    // (Passing `screen:` to the initializer re-bases the origin and misplaces
    // windows on secondary displays, so we set the global frame explicitly.)
    window.setFrame(screen.frame, display: false)
    window.level = .screenSaver  // float above everything, including the menu bar
    window.backgroundColor = .black
    window.isOpaque = true
    window.hasShadow = false
    // Visible on every Space and over native fullscreen apps.
    window.collectionBehavior = [.canJoinAllSpaces, .fullScreenAuxiliary]

    if showsButton, let contentView = window.contentView {
      contentView.addSubview(makeDismissButton(in: contentView.bounds))
    }

    window.makeKeyAndOrderFront(nil)
    return window
  }

  private func makeDismissButton(in bounds: NSRect) -> NSButton {
    let button = NSButton(
      title: "Done — Restore Screen & Keyboard",
      target: self,
      action: #selector(handleDismiss)
    )
    button.bezelStyle = .rounded
    button.keyEquivalent = "\r"  // Return also dismisses while the window is key
    button.sizeToFit()
    let size = button.fittingSize
    button.frame = NSRect(
      x: (bounds.width - size.width) / 2,
      y: (bounds.height - size.height) / 2,
      width: size.width,
      height: size.height
    )
    // Stay centered if the screen geometry changes.
    button.autoresizingMask = [.minXMargin, .maxXMargin, .minYMargin, .maxYMargin]
    return button
  }

  // MARK: - Dismissal

  @objc private func handleDismiss() {
    teardown()
    NSApp.stop(nil)
    // `stop(_:)` only takes effect after the next event is pulled, so post a
    // no-op event to make `NSApp.run()` return promptly.
    let nudge = NSEvent.otherEvent(
      with: .applicationDefined,
      location: .zero,
      modifierFlags: [],
      timestamp: 0,
      windowNumber: 0,
      context: nil,
      subtype: 0,
      data1: 0,
      data2: 0
    )
    if let nudge {
      NSApp.postEvent(nudge, atStart: true)
    }
  }

  private func teardown() {
    removeEventTap()
    for window in windows {
      window.orderOut(nil)
    }
    windows.removeAll()
  }

  // MARK: - Keyboard suppression (CGEvent tap)

  private func installEventTap() {
    let mask =
      (1 << CGEventType.keyDown.rawValue) | (1 << CGEventType.keyUp.rawValue)
      | (1 << CGEventType.flagsChanged.rawValue)
      // NX_SYSDEFINED (14): system-defined HID events — the media / aux control
      // keys (volume, mute, play/pause, brightness). These aren't keyDown events,
      // so they need their own mask bit; CGEventType has no symbolic case for it.
      | (1 << 14)

    guard
      let tap = CGEvent.tapCreate(
        tap: .cgSessionEventTap,
        place: .headInsertEventTap,
        options: .defaultTap,
        eventsOfInterest: CGEventMask(mask),
        callback: keyboardSuppressingTapCallback,
        userInfo: nil
      )
    else {
      // No Accessibility permission → the tap can't be created. The
      // `.screenSaver`-level key window still swallows most keys (level 1).
      return
    }

    let source = CFMachPortCreateRunLoopSource(kCFAllocatorDefault, tap, 0)
    CFRunLoopAddSource(CFRunLoopGetMain(), source, .commonModes)
    CGEvent.tapEnable(tap: tap, enable: true)

    eventTap = tap
    runLoopSource = source
  }

  private func removeEventTap() {
    if let tap = eventTap {
      CGEvent.tapEnable(tap: tap, enable: false)
    }
    if let source = runLoopSource {
      CFRunLoopRemoveSource(CFRunLoopGetMain(), source, .commonModes)
    }
    eventTap = nil
    runLoopSource = nil
  }
}
