import AppKit
import AVFoundation
import Darwin
import QuartzCore
import RaycastSwiftMacros
import ScreenCaptureKit

struct KickflipError: Error, CustomStringConvertible {
  let description: String
  init(_ message: String) { description = message }
}

@raycast func animateKickflip(playSound: Bool) async throws {
  try await runKickflip(playSound: playSound)
}

@MainActor
private func runKickflip(playSound: Bool) async throws {
  // Raycast can launch the two commands in separate processes.
  let lockPath = FileManager.default.temporaryDirectory.appendingPathComponent("window-kickflip-animation.lock").path
  let lock = open(lockPath, O_CREAT | O_RDWR, S_IRUSR | S_IWUSR)
  guard lock >= 0 else { throw KickflipError("Couldn't prepare the animation lock.") }
  defer { close(lock) }
  // A repeated hotkey press while a window is already in the air is ignored.
  guard flock(lock, LOCK_EX | LOCK_NB) == 0 else { return }
  defer { flock(lock, LOCK_UN) }
  guard CGPreflightScreenCaptureAccess() || CGRequestScreenCaptureAccess() else {
    throw KickflipError("Allow Raycast in System Settings > Privacy & Security > Screen & System Audio Recording, then restart Raycast.")
  }

  guard let focusedApp = NSWorkspace.shared.frontmostApplication, focusedApp.bundleIdentifier?.hasPrefix("com.raycast") != true else {
    throw KickflipError("Focus the window you want to flip, then run Kickflip again.")
  }
  let processID = focusedApp.processIdentifier
  let windowList = CGWindowListCopyWindowInfo([.optionOnScreenOnly, .excludeDesktopElements], kCGNullWindowID)
    as? [[String: Any]] ?? []
  guard let windowID = frontWindowID(in: windowList, processID: processID) else {
    throw KickflipError("\(focusedApp.localizedName ?? "The focused app") has no window to kickflip.")
  }

  let content = try await SCShareableContent.excludingDesktopWindows(false, onScreenWindowsOnly: true)
  guard let target = content.windows.first(where: { $0.windowID == windowID }) else {
    throw KickflipError("The focused window is no longer available. Focus it and run Kickflip again.")
  }
  guard target.frame.width > 0, target.frame.height > 0,
        [target.frame.minX, target.frame.minY, target.frame.width, target.frame.height].allSatisfy(\.isFinite) else {
    throw KickflipError("The focused window has invalid bounds.")
  }
  // A window spanning displays flies on the one that shows most of it.
  guard let displayIndex = largestOverlap(of: target.frame, in: content.displays.map(\.frame)),
        case let display = content.displays[displayIndex],
        let screen = NSScreen.screens.first(where: {
          ($0.deviceDescription[NSDeviceDescriptionKey("NSScreenNumber")] as? NSNumber)?.uint32Value == display.displayID
        }) else {
    throw KickflipError("Move the window onto a display, then try again.")
  }
  guard target.frame != display.frame else {
    throw KickflipError("Fullscreen windows can't kickflip. Exit fullscreen and try again.")
  }

  // Exclude the target from the backdrop so there is no stationary duplicate underneath.
  let scale = screen.backingScaleFactor
  let windowConfig = captureConfiguration(size: target.frame.size, scale: scale)
  if #available(macOS 14.2, *) {
    windowConfig.ignoreShadowsSingleWindow = true
  }
  let snapshot = try await SCScreenshotManager.captureImage(
    contentFilter: SCContentFilter(desktopIndependentWindow: target), configuration: windowConfig)
  let background = try await SCScreenshotManager.captureImage(
    contentFilter: SCContentFilter(display: display, excludingWindows: [target]),
    configuration: captureConfiguration(size: display.frame.size, scale: scale))

  guard NSWorkspace.shared.frontmostApplication?.processIdentifier == processID else {
    throw KickflipError("The focused app changed. Run Kickflip again on the window you want.")
  }
  let app = NSApplication.shared
  app.setActivationPolicy(.accessory)
  let overlay = NSPanel(contentRect: screen.frame, styleMask: [.borderless, .nonactivatingPanel],
                        backing: .buffered, defer: false)
  overlay.isOpaque = false
  overlay.backgroundColor = .clear
  overlay.hasShadow = false
  overlay.ignoresMouseEvents = true
  overlay.hidesOnDeactivate = false
  overlay.isReleasedWhenClosed = false
  overlay.level = .floating
  overlay.collectionBehavior = [.transient, .ignoresCycle]
  defer { overlay.orderOut(nil); overlay.close() }

  let view = NSView(frame: CGRect(origin: .zero, size: screen.frame.size))
  view.wantsLayer = true
  let root = CALayer()
  root.frame = view.bounds
  root.contents = background
  root.contentsScale = scale
  view.layer = root
  overlay.contentView = view

  let frame = appKitFrame(target.frame, mainDisplayHeight: CGDisplayBounds(CGMainDisplayID()).height)
    .offsetBy(dx: -screen.frame.minX, dy: -screen.frame.minY)
  let craft = CALayer()
  craft.bounds = CGRect(origin: .zero, size: frame.size)
  craft.position = CGPoint(x: frame.midX, y: frame.midY)
  let picture = CALayer()
  picture.frame = craft.bounds
  picture.contents = snapshot
  picture.contentsScale = scale
  picture.shadowColor = NSColor.black.cgColor
  picture.shadowOpacity = 0.35
  picture.shadowRadius = 22
  picture.shadowOffset = CGSize(width: 0, height: -12)
  // The shadow rotates with the window anyway, so render it once instead of every frame.
  picture.shouldRasterize = true
  picture.rasterizationScale = scale
  craft.addSublayer(picture)

  let particle = try makeAirParticle()
  let path = FlightPath(window: frame, stage: view.bounds)
  let frameCount = Int(FlightPath.duration * 120)
  let poses = (0...frameCount).map { path.pose(at: Double($0) / Double(frameCount)) }
  // Audio is optional: failure to initialize a device must not prevent the animation.
  let sound = playSound ? try? AVAudioPlayer(data: ThrusterSound.wavData()) : nil
  sound?.volume = 0.35
  sound?.prepareToPlay()
  defer { sound?.stop() }
  let start = CACurrentMediaTime() + 0.08
  addThrusters(to: root, windowSize: frame.size, poses: poses, particle: particle, start: start)
  // The window occludes exhaust crossing behind it.
  root.addSublayer(craft)
  addAnimation(to: craft, key: "position", values: poses.map { NSValue(point: $0.center) }, start: start)
  addAnimation(to: craft, key: "transform.rotation.z", values: poses.map { $0.rotation }, start: start)
  addAnimation(to: craft, key: "transform.scale", values: poses.map { $0.scale }, start: start)
  // Fade the frozen backdrop into the live desktop instead of popping it away.
  let fadeDuration = 0.12
  let fade = CABasicAnimation(keyPath: "opacity")
  fade.fromValue = 1
  fade.toValue = 0
  fade.duration = fadeDuration
  fade.beginTime = start + FlightPath.duration
  fade.fillMode = .both
  fade.isRemovedOnCompletion = false
  root.add(fade, forKey: "fade")
  overlay.orderFrontRegardless()
  CATransaction.flush()
  if let sound {
    sound.play(atTime: sound.deviceCurrentTime + max(0, start - CACurrentMediaTime()))
  }
  try await Task.sleep(for: .seconds(max(0, start + FlightPath.duration + fadeDuration - CACurrentMediaTime()) + 0.02))
}

private func captureConfiguration(size: CGSize, scale: CGFloat) -> SCStreamConfiguration {
  let config = SCStreamConfiguration()
  config.width = Int((size.width * scale).rounded())
  config.height = Int((size.height * scale).rounded())
  config.showsCursor = false
  config.capturesAudio = false
  config.captureResolution = .best
  return config
}

private func makeAirParticle() throws -> CGImage {
  let colorSpace = CGColorSpaceCreateDeviceRGB()
  guard let context = CGContext(data: nil, width: 32, height: 32, bitsPerComponent: 8, bytesPerRow: 0,
                                space: colorSpace, bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue),
        let gradient = CGGradient(colorsSpace: colorSpace,
                                  colors: [CGColor(gray: 1, alpha: 1), CGColor(gray: 1, alpha: 0)] as CFArray,
                                  locations: [0, 1]) else {
    throw KickflipError("Couldn't prepare the air thrusters.")
  }
  context.drawRadialGradient(gradient, startCenter: CGPoint(x: 16, y: 16), startRadius: 1,
                             endCenter: CGPoint(x: 16, y: 16), endRadius: 16, options: [])
  guard let image = context.makeImage() else { throw KickflipError("Couldn't prepare the air thrusters.") }
  return image
}
