import AppKit
import CoreGraphics
import Foundation

// Captures the real Raycast main window, then adds a Store-sized background.
// Run only with permission to use macOS screencapture for the target window.
// Requires Screen Recording permission; no app content is recreated or generated.

func fail(_ message: String) -> Never {
  FileHandle.standardError.write(Data((message + "\n").utf8))
  exit(1)
}

let arguments = Array(CommandLine.arguments.dropFirst())
guard arguments.count == 1 || (arguments.count == 3 && ["--delay", "--ready-file"].contains(arguments[1])) else {
  fail("Usage: swift tools/capture-store.swift metadata/screenshot.png [--delay seconds | --ready-file path]")
}
let readyFile = arguments.count == 3 && arguments[1] == "--ready-file" ? arguments[2] : nil
let delay = arguments.count == 3 && arguments[1] == "--delay" ? Double(arguments[2]) : 0
guard let delay, delay.isFinite, (0...60).contains(delay) else {
  fail("Capture delay must be between 0 and 60 seconds.")
}
if delay > 0 {
  print("Switch back to the intended Raycast extension view; capturing in \(delay) seconds.")
  fflush(stdout)
  Thread.sleep(forTimeInterval: delay)
}
if let readyFile {
  print("Waiting for the prepared capture view…")
  fflush(stdout)
  let readyDeadline = Date().addingTimeInterval(60)
  while !FileManager.default.fileExists(atPath: readyFile), Date() < readyDeadline {
    Thread.sleep(forTimeInterval: 0.1)
  }
  guard FileManager.default.fileExists(atPath: readyFile) else {
    fail("The capture view was not marked ready. No screenshot was exported.")
  }
}
guard CGPreflightScreenCaptureAccess() else {
  fail("Screen capture is not authorized for this process. Run from a terminal with macOS Screen Recording permission. No screenshot was exported.")
}
// Approval prompts can hide Raycast's floating panel. Wait briefly so the
// intended view can be raised again after command execution is authorized.
print("Waiting for Raycast's visible Main Window…")
fflush(stdout)
let deadline = Date().addingTimeInterval(45)
var windowID: UInt32?
while Date() < deadline {
  let windows = CGWindowListCopyWindowInfo(.optionOnScreenOnly, kCGNullWindowID) as? [[String: Any]] ?? []
  if let window = windows.first(where: {
    ($0[kCGWindowOwnerName as String] as? String) == "Raycast"
      && ($0[kCGWindowName as String] as? String) == "Main Window"
  }), let identifier = window[kCGWindowNumber as String] as? UInt32 {
    windowID = identifier
    break
  }
  Thread.sleep(forTimeInterval: 0.25)
}
guard let windowID else {
  fail("Open the intended extension view in Raycast. Its Main Window must be visible and screen capture must be authorized.")
}

let temporary = FileManager.default.temporaryDirectory
  .appendingPathComponent("jw-store-capture-\(UUID().uuidString).png")
defer { try? FileManager.default.removeItem(at: temporary) }

let capture = Process()
capture.executableURL = URL(fileURLWithPath: "/usr/sbin/screencapture")
capture.arguments = ["-x", "-o", "-l", String(windowID), temporary.path]
do { try capture.run() } catch { fail("Could not start macOS screencapture: \(error)") }
capture.waitUntilExit()
guard capture.terminationStatus == 0,
      let source = NSImage(contentsOf: temporary) else {
  fail("macOS could not capture the Raycast window. Check Screen Recording permission; no screenshot was exported.")
}

let width = 2000
let height = 1250
guard let bitmap = NSBitmapImageRep(
  bitmapDataPlanes: nil, pixelsWide: width, pixelsHigh: height,
  bitsPerSample: 8, samplesPerPixel: 4, hasAlpha: true, isPlanar: false,
  colorSpaceName: .deviceRGB, bytesPerRow: 0, bitsPerPixel: 0
), let context = NSGraphicsContext(bitmapImageRep: bitmap) else {
  fail("Could not allocate the screenshot canvas.")
}

NSGraphicsContext.saveGraphicsState()
NSGraphicsContext.current = context
let canvas = NSRect(x: 0, y: 0, width: width, height: height)
let top = NSColor(srgbRed: 0.93, green: 0.92, blue: 0.96, alpha: 1)
let bottom = NSColor(srgbRed: 0.83, green: 0.81, blue: 0.89, alpha: 1)
NSGradient(starting: bottom, ending: top)?.draw(in: canvas, angle: 90)

// NSImage's point size can differ from pixel size on Retina displays.
guard let representation = source.representations.first,
      representation.pixelsWide > 0, representation.pixelsHigh > 0 else {
  fail("The captured image has no pixels.")
}
let sourceWidth = CGFloat(representation.pixelsWide)
let sourceHeight = CGFloat(representation.pixelsHigh)
let scale = min(1, min(1800 / sourceWidth, 1080 / sourceHeight))
let drawWidth = sourceWidth * scale
let drawHeight = sourceHeight * scale
let frame = NSRect(
  x: (CGFloat(width) - drawWidth) / 2, y: (CGFloat(height) - drawHeight) / 2,
  width: drawWidth, height: drawHeight
)
let shadow = NSShadow()
shadow.shadowColor = NSColor.black.withAlphaComponent(0.18)
shadow.shadowBlurRadius = 24
shadow.shadowOffset = NSSize(width: 0, height: -10)
shadow.set()
source.draw(in: frame, from: .zero, operation: .sourceOver, fraction: 1)
NSGraphicsContext.restoreGraphicsState()

guard let png = bitmap.representation(using: .png, properties: [:]) else {
  fail("Could not encode the Store PNG.")
}
let output = URL(fileURLWithPath: arguments[0]).standardizedFileURL
do {
  try FileManager.default.createDirectory(at: output.deletingLastPathComponent(), withIntermediateDirectories: true)
  try png.write(to: output, options: .atomic)
  print("Saved \(output.path) (\(width) × \(height))")
} catch {
  fail("Could not save the screenshot: \(error)")
}
