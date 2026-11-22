import AppKit

struct RecorderConfig {
  /// Global top-left points.
  var rect: CGRect
  var windowId: Int?
  var output: String
  var countdown = 3
  var maxSeconds = 0
  var showClicks = false
  var showCursor = false
  var doneURL: URL?
}

/// Runs one recording: countdown, then `screencapture -v` with a red frame
/// around the area and a floating timer with a Stop button. None of that UI
/// ends up in the video (sharingType = .none).
///
/// Stops on the Stop button, SIGINT/SIGTERM, or the max duration. When the
/// recording ends it opens `doneURL` (the extension's preview deeplink).
/// Exit codes: 0 saved, 2 cancelled, 3 no video.
final class Recorder {
  private var config: RecorderConfig
  private var process: Process?
  private var startedAt: Date?
  private var stopping = false
  private var countdownPanel: NSWindow?
  private var frameWindow: NSWindow?
  private var pill: PillPanel?
  private var pillMotion: SpringAnimator?
  private var ticker: Timer?
  private var signalSources: [DispatchSourceSignal] = []

  init(config: RecorderConfig) {
    self.config = config
  }

  func run() {
    for sig in [SIGINT, SIGTERM] {
      signal(sig, SIG_IGN)
      let source = DispatchSource.makeSignalSource(signal: sig, queue: .main)
      source.setEventHandler { [weak self] in self?.stopOrCancel() }
      source.resume()
      signalSources.append(source)
    }

    if config.countdown > 0 {
      runCountdown(config.countdown)
    } else {
      begin()
    }
  }

  private var cocoaRect: NSRect { Geometry.toCocoa(config.rect) }

  // MARK: countdown

  private func runCountdown(_ seconds: Int) {
    let size = NSSize(width: 140, height: 140)
    let frame = NSRect(
      x: cocoaRect.midX - size.width / 2, y: cocoaRect.midY - size.height / 2, width: size.width,
      height: size.height)
    let panel = makeOverlayWindow(frame: frame, panel: true)
    let view = CountdownView(frame: NSRect(origin: .zero, size: size))
    view.onClick = { exit(2) }
    panel.contentView = view
    panel.alphaValue = 0
    panel.orderFrontRegardless()
    fade(panel, to: 1, duration: 0.18)
    countdownPanel = panel

    var remaining = seconds
    view.show(remaining)
    Timer.scheduledTimer(withTimeInterval: 1, repeats: true) { [weak self] timer in
      remaining -= 1
      if remaining > 0 {
        view.show(remaining)

        return
      }

      timer.invalidate()
      // The disc dissolves into the recording frame that appears in its place.
      fade(panel, to: 0, duration: 0.15) {
        panel.orderOut(nil)
        self?.countdownPanel = nil
        self?.begin()
      }
    }
  }

  // MARK: recording

  private func begin() {
    var args = ["-x", "-v"]
    if config.showClicks { args.append("-k") }
    if config.showCursor { args.append("-C") }
    if let id = config.windowId {
      args += ["-l\(id)", "-o"]
    } else {
      args.append("-R\(Geometry.format(config.rect))")
    }
    args.append(config.output)

    let process = Process()
    process.executableURL = URL(fileURLWithPath: "/usr/sbin/screencapture")
    process.arguments = args
    process.terminationHandler = { _ in DispatchQueue.main.async { self.finish() } }
    do {
      try process.run()
    } catch {
      exit(3)
    }

    self.process = process
    startedAt = Date()
    confirmHaptic()
    showFrame()
    showPill()
    ticker = Timer.scheduledTimer(withTimeInterval: 0.5, repeats: true) { [weak self] _ in self?.tick() }
  }

  private func showFrame() {
    let window = makeOverlayWindow(frame: cocoaRect.insetBy(dx: -4, dy: -4))
    window.ignoresMouseEvents = true
    window.level = NSWindow.Level(rawValue: Int(CGShieldingWindowLevel()))
    window.contentView = FrameView(frame: NSRect(origin: .zero, size: window.frame.size))
    window.alphaValue = 0
    window.orderFrontRegardless()
    fade(window, to: 1, duration: 0.2)
    frameWindow = window
  }

  private func showPill() {
    let panel = PillPanel()
    panel.onStop = { [weak self] in self?.stop() }
    pill = panel
    let origin = pillOrigin(size: panel.frame.size)
    panel.setFrameOrigin(origin)
    panel.alphaValue = 0
    panel.orderFrontRegardless()
    if Accessibility.reduceMotion {
      fade(panel, to: 1, duration: 0.2)

      return
    }

    // The pill emerges from the recorded area, so it reads as belonging to it.
    pillMotion = SpringAnimator(values: [1, 0]) { [weak self, weak panel] values in
      guard let self, let panel else { return }

      let base = self.pillOrigin(size: panel.frame.size)
      panel.setFrameOrigin(NSPoint(x: base.x, y: base.y + values[0] * self.pillTravel(from: base)))
      panel.alphaValue = values[1]
    }
    pillMotion?.animate(to: [0, 1])
  }

  /// 12pt toward the recorded area: up when the pill sits below it, down otherwise.
  private func pillTravel(from origin: NSPoint) -> CGFloat {
    origin.y < cocoaRect.minY ? 12 : -12
  }

  /// Leaves the way it came: back toward the recorded area, fading out.
  private func dismissUI(completion: @escaping () -> Void) {
    ticker?.invalidate()
    if let frameWindow { fade(frameWindow, to: 0, duration: 0.15) }
    guard let pill else {
      completion()

      return
    }

    if let pillMotion, !Accessibility.reduceMotion {
      pillMotion.animate(to: [1, 0], completion: completion)
    } else {
      fade(pill, to: 0, duration: 0.15, completion: completion)
    }
  }

  private func pillOrigin(size: NSSize) -> NSPoint {
    let rect = cocoaRect
    let screen = (NSScreen.screens.first { $0.frame.intersects(rect) } ?? NSScreen.screens[0]).visibleFrame
    let x = min(max(rect.midX - size.width / 2, screen.minX + 8), screen.maxX - size.width - 8)
    if rect.minY - size.height - 12 >= screen.minY {
      return NSPoint(x: x, y: rect.minY - size.height - 12)
    }

    if rect.maxY + size.height + 12 <= screen.maxY {
      return NSPoint(x: x, y: rect.maxY + 12)
    }

    // The area fills the screen: sit inside it, at the bottom.
    return NSPoint(x: x, y: max(rect.minY, screen.minY) + 24)
  }

  private func tick() {
    guard let startedAt, !stopping else { return }

    let elapsed = Int(Date().timeIntervalSince(startedAt))
    pill?.setElapsed(elapsed, max: config.maxSeconds)
    if config.maxSeconds > 0, elapsed >= config.maxSeconds {
      stop()

      return
    }

    // Follow a recorded window that moves.
    if let id = config.windowId, let bounds = Windows.bounds(of: id), bounds != config.rect {
      config.rect = bounds
      frameWindow?.setFrame(cocoaRect.insetBy(dx: -4, dy: -4), display: true)
      if let pill { pill.setFrameOrigin(pillOrigin(size: pill.frame.size)) }
    }
  }

  private func stopOrCancel() {
    if process == nil {
      exit(2)
    }

    stop()
  }

  private func stop() {
    guard !stopping, let process else { return }

    stopping = true
    confirmHaptic()
    pill?.showSaving()
    process.interrupt()
  }

  private func finish() {
    let attributes = try? FileManager.default.attributesOfItem(atPath: config.output)
    let saved = (attributes?[.size] as? Int ?? 0) > 0
    dismissUI {
      // The preview opens either way, so a failed recording is reported too.
      guard let url = self.config.doneURL else { exit(saved ? 0 : 3) }

      NSWorkspace.shared.open(url, configuration: NSWorkspace.OpenConfiguration()) { _, _ in exit(saved ? 0 : 3) }
    }
  }
}
