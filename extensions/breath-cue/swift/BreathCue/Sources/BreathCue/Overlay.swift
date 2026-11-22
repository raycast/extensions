import AppKit
import Foundation
import RaycastSwiftMacros
import SwiftUI

struct BreathPhase: Codable {
  let label: String
  let seconds: Double
  /// Target size of the circle at the end of the phase, 0...1.
  let scale: Double
}

struct OverlayConfig: Codable {
  let reason: String
  let title: String
  let subtitle: String
  let phases: [BreathPhase]
  let cycles: Int
  let resultPath: String
  let lockPath: String
}

struct OverlayResult: Codable {
  let reason: String
  let completed: Bool
  let shownSeconds: Double
  let endedAt: Double
}

enum OverlayError: Error {
  case spawnFailed(Int32)
  case badConfig
}

/// Starts the overlay in a detached process and returns at once, so Raycast's background
/// command never waits on the minute-long animation. Returns false if an overlay is already up.
@raycast func presentBreathing(config: OverlayConfig) throws -> Bool {
  if isOverlayRunning(lockPath: config.lockPath) { return false }
  guard let exe = Bundle.main.executablePath else { throw OverlayError.badConfig }
  let json = String(decoding: try JSONEncoder().encode(config), as: UTF8.self)

  var attr: posix_spawnattr_t?
  posix_spawnattr_init(&attr)
  defer { posix_spawnattr_destroy(&attr) }
  posix_spawnattr_setflags(&attr, Int16(POSIX_SPAWN_SETSID))

  // Detach stdio: Raycast reads our stdout until it closes, the child must not hold it.
  var actions: posix_spawn_file_actions_t?
  posix_spawn_file_actions_init(&actions)
  defer { posix_spawn_file_actions_destroy(&actions) }
  posix_spawn_file_actions_addopen(&actions, 0, "/dev/null", O_RDONLY, 0)
  posix_spawn_file_actions_addopen(&actions, 1, "/dev/null", O_WRONLY, 0)
  posix_spawn_file_actions_addopen(&actions, 2, "/dev/null", O_WRONLY, 0)

  let args = [exe, "runOverlay", json]
  var cArgs: [UnsafeMutablePointer<CChar>?] = args.map { strdup($0) } + [nil]
  defer { cArgs.forEach { free($0) } }

  var pid: pid_t = 0
  let rc = posix_spawn(&pid, exe, &actions, &attr, &cArgs, environ)
  guard rc == 0 else { throw OverlayError.spawnFailed(rc) }
  return true
}

/// Runs the overlay in the current process (used by the detached child).
@raycast func runOverlay(config: OverlayConfig) async {
  // The AppKit loop must not run inside a main-queue block (the main queue is serial and would stall),
  // so it is scheduled as a plain run-loop block. The process exits from `finish`.
  await withCheckedContinuation { (_: CheckedContinuation<Void, Never>) in
    CFRunLoopPerformBlock(CFRunLoopGetMain(), CFRunLoopMode.commonModes.rawValue) {
      MainActor.assumeIsolated { OverlayController.start(config) }
    }
    CFRunLoopWakeUp(CFRunLoopGetMain())
  }
}

// MARK: - Controller

@MainActor
final class OverlayController {
  private static var current: OverlayController?

  private let config: OverlayConfig
  private let model = BreathModel()
  private var panels: [OverlayPanel] = []
  private var startedAt = Date()
  private var finished = false

  static func start(_ config: OverlayConfig) {
    let app = NSApplication.shared
    app.setActivationPolicy(.accessory)
    let controller = OverlayController(config: config)
    current = controller
    controller.show()
    app.run()
  }

  private init(config: OverlayConfig) {
    self.config = config
  }

  private func show() {
    try? "\(getpid())".write(toFile: config.lockPath, atomically: true, encoding: .utf8)
    model.title = config.title
    model.subtitle = config.subtitle
    model.totalCycles = max(1, config.cycles)

    let mouse = NSEvent.mouseLocation
    let screens = NSScreen.screens
    let focusScreen = screens.first { NSMouseInRect(mouse, $0.frame, false) } ?? screens.first

    for screen in screens {
      let panel = OverlayPanel(screen: screen)
      let root = OverlayRootView(frame: NSRect(origin: .zero, size: screen.frame.size))
      root.onDismiss = { [weak self] in self?.finish(completed: false) }
      if screen == focusScreen {
        let hosting = PassthroughHostingView(rootView: BreathView(model: model))
        hosting.frame = root.bounds
        hosting.autoresizingMask = [.width, .height]
        root.addSubview(hosting)
      }
      panel.contentView = root
      panel.alphaValue = 0
      panel.orderFrontRegardless()
      if screen == focusScreen {
        panel.makeKey()
        panel.makeFirstResponder(root)
      }
      panels.append(panel)
    }

    NSAnimationContext.runAnimationGroup { ctx in
      ctx.duration = 1.4
      panels.forEach { $0.animator().alphaValue = 1 }
    }

    let phases = config.phases.isEmpty
      ? [BreathPhase(label: "Breathe in", seconds: 4, scale: 1), BreathPhase(label: "Breathe out", seconds: 6, scale: 0.4)]
      : config.phases
    let total = phases.reduce(0) { $0 + $1.seconds } * Double(model.totalCycles)

    // Hard stop, whatever happens. The second one runs off the main thread in case it is stuck.
    DispatchQueue.main.asyncAfter(deadline: .now() + total + 15) { [weak self] in
      self?.finish(completed: true)
    }
    let lockPath = config.lockPath
    DispatchQueue.global().asyncAfter(deadline: .now() + total + 25) {
      try? FileManager.default.removeItem(atPath: lockPath)
      exit(0)
    }

    Task { @MainActor [weak self] in
      try? await Task.sleep(nanoseconds: 1_600_000_000)
      for cycle in 1...(self?.model.totalCycles ?? 1) {
        for phase in phases {
          guard let self, !self.finished else { return }
          self.model.cycle = cycle
          withAnimation(.easeInOut(duration: 0.5)) { self.model.label = phase.label }
          withAnimation(.easeInOut(duration: phase.seconds)) { self.model.scale = phase.scale }
          try? await Task.sleep(nanoseconds: UInt64(phase.seconds * 1_000_000_000))
        }
      }
      self?.model.label = "Nice."
      try? await Task.sleep(nanoseconds: 1_200_000_000)
      self?.finish(completed: true)
    }
  }

  private func finish(completed: Bool) {
    guard !finished else { return }
    finished = true
    let result = OverlayResult(
      reason: config.reason,
      completed: completed,
      shownSeconds: Date().timeIntervalSince(startedAt),
      endedAt: Date().timeIntervalSince1970 * 1000
    )
    if let data = try? JSONEncoder().encode(result) {
      try? data.write(to: URL(fileURLWithPath: config.resultPath), options: .atomic)
    }
    try? FileManager.default.removeItem(atPath: config.lockPath)

    NSAnimationContext.runAnimationGroup({ ctx in
      ctx.duration = completed ? 1.0 : 0.35
      panels.forEach { $0.animator().alphaValue = 0 }
    }, completionHandler: {
      exit(0)
    })
  }
}

// MARK: - Windows

final class OverlayPanel: NSPanel {
  init(screen: NSScreen) {
    super.init(
      contentRect: screen.frame,
      styleMask: [.borderless, .nonactivatingPanel],
      backing: .buffered,
      defer: false
    )
    setFrame(screen.frame, display: false)
    level = .screenSaver
    isOpaque = false
    backgroundColor = .clear
    hasShadow = false
    hidesOnDeactivate = false
    isReleasedWhenClosed = false
    collectionBehavior = [.canJoinAllSpaces, .fullScreenAuxiliary, .stationary, .ignoresCycle]
    appearance = NSAppearance(named: .darkAqua)
  }

  override var canBecomeKey: Bool { true }
  override var canBecomeMain: Bool { false }
}

/// Blurred, dimmed backdrop that dismisses the overlay on click or Esc.
final class OverlayRootView: NSVisualEffectView {
  var onDismiss: (() -> Void)?

  override init(frame: NSRect) {
    super.init(frame: frame)
    material = .fullScreenUI
    blendingMode = .behindWindow
    state = .active
    wantsLayer = true
    let tint = CALayer()
    tint.backgroundColor = NSColor(calibratedRed: 0.02, green: 0.04, blue: 0.08, alpha: 0.55).cgColor
    tint.frame = bounds
    tint.autoresizingMask = [.layerWidthSizable, .layerHeightSizable]
    layer?.addSublayer(tint)
  }

  required init?(coder: NSCoder) { fatalError() }

  override var acceptsFirstResponder: Bool { true }
  override func acceptsFirstMouse(for event: NSEvent?) -> Bool { true }
  override func mouseDown(with event: NSEvent) { onDismiss?() }
  override func keyDown(with event: NSEvent) {
    if event.keyCode == 53 { onDismiss?() } else { super.keyDown(with: event) }
  }
}

final class PassthroughHostingView<Content: View>: NSHostingView<Content> {
  override func hitTest(_ point: NSPoint) -> NSView? { nil }
}

// MARK: - SwiftUI

@MainActor
final class BreathModel: ObservableObject {
  @Published var title = ""
  @Published var subtitle = ""
  @Published var label = "Settle in"
  @Published var scale = 0.45
  @Published var cycle = 1
  @Published var totalCycles = 1
}

struct BreathView: View {
  @ObservedObject var model: BreathModel

  var body: some View {
    VStack(spacing: 0) {
      Spacer()
      VStack(spacing: 10) {
        Text(model.title)
          .font(.system(size: 26, weight: .semibold, design: .rounded))
          .foregroundStyle(.white.opacity(0.92))
        Text(model.subtitle)
          .font(.system(size: 16, weight: .regular, design: .rounded))
          .foregroundStyle(.white.opacity(0.6))
      }
      .multilineTextAlignment(.center)
      .padding(.horizontal, 40)

      ZStack {
        Circle()
          .fill(
            RadialGradient(
              colors: [Color(red: 0.55, green: 0.86, blue: 0.86).opacity(0.35), .clear],
              center: .center, startRadius: 40, endRadius: 230)
          )
          .frame(width: 460, height: 460)
          .scaleEffect(0.6 + model.scale * 0.5)
        Circle()
          .fill(
            LinearGradient(
              colors: [Color(red: 0.49, green: 0.85, blue: 0.80), Color(red: 0.42, green: 0.48, blue: 0.93)],
              startPoint: .topLeading, endPoint: .bottomTrailing)
          )
          .frame(width: 280, height: 280)
          .scaleEffect(0.35 + model.scale * 0.65)
          .shadow(color: Color(red: 0.5, green: 0.8, blue: 0.9).opacity(0.5), radius: 40)
        Text(model.label)
          .font(.system(size: 24, weight: .medium, design: .rounded))
          .foregroundStyle(.white)
          .id(model.label)
          .transition(.opacity)
      }
      .frame(height: 480)

      Spacer()
      Text("Breath \(model.cycle) of \(model.totalCycles)  ·  click or press Esc to skip")
        .font(.system(size: 13, weight: .regular, design: .rounded))
        .foregroundStyle(.white.opacity(0.4))
        .padding(.bottom, 56)
    }
    .frame(maxWidth: .infinity, maxHeight: .infinity)
  }
}
