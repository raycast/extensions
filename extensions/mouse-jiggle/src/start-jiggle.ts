import { spawn } from "child_process";
import { writeFile, rm, access, mkdir } from "fs/promises";
import { showToast, Toast, getPreferenceValues } from "@raycast/api";
import { join } from "path";
import { homedir } from "os";

const SENTINEL = join(homedir(), ".mouse-jiggle.active");
const SWIFT_DIR = join(homedir(), ".mouse-jiggle-swift");

function buildDefaultScript(sentinel: string): string {
  return `import Foundation
import CoreGraphics

let sentinelPath = "${sentinel}"

func moveMouseTo(x: CGFloat, y: CGFloat) {
    let pt = CGPoint(x: x, y: y)
    CGEvent(mouseEventSource: nil, mouseType: .mouseMoved, mouseCursorPosition: pt, mouseButton: .left)?.post(tap: .cghidEventTap)
}

let displayID = CGMainDisplayID()
let screenWidth = CGFloat(CGDisplayPixelsWide(displayID))
let screenHeight = CGFloat(CGDisplayPixelsHigh(displayID))

var heading = Double.random(in: 0..<(2 * .pi))
var stepCount = 0

while FileManager.default.fileExists(atPath: sentinelPath) {
    guard let loc = CGEvent(source: nil)?.location else { continue }

    let distance = Double.random(in: 80...150)
    var dx = cos(heading) * distance
    var dy = sin(heading) * distance
    var newX = loc.x + CGFloat(dx)
    var newY = loc.y + CGFloat(dy)

    if newX < 50 || newX > screenWidth - 50 {
        dx = -dx
        newX = loc.x + CGFloat(dx)
        heading = .pi - heading
    }
    if newY < 50 || newY > screenHeight - 50 {
        dy = -dy
        newY = loc.y + CGFloat(dy)
        heading = -heading
    }

    moveMouseTo(x: newX, y: newY)

    if stepCount % 5 == 0 {
        heading += Double.random(in: 1.5...3.0)
    } else if stepCount % 3 == 0 {
        heading += Double.random(in: 0.8...1.5)
    } else {
        heading += Double.random(in: -0.5...0.5)
    }
    stepCount += 1

    let ticks = Int.random(in: 5...10)
    for _ in 0..<ticks {
        if !FileManager.default.fileExists(atPath: sentinelPath) { exit(0) }
        Thread.sleep(forTimeInterval: 0.2)
    }
}
`;
}

function buildFunScript(sentinel: string): string {
  return `import Foundation
import Cocoa

let sentinelPath = "${sentinel}"

// MARK: - Trail View
class TrailView: NSView {
    var points: [NSPoint] = []
    let maxPoints = 2000

    override var isFlipped: Bool { return false }

    override func draw(_ dirtyRect: NSRect) {
        super.draw(dirtyRect)
        guard points.count > 1 else { return }

        let path = NSBezierPath()
        path.move(to: points[0])
        for i in 1..<points.count {
            path.line(to: points[i])
        }

        NSColor.systemOrange.withAlphaComponent(0.9).setStroke()
        path.lineWidth = 3
        path.lineCapStyle = .round
        path.lineJoinStyle = .round
        path.stroke()
    }

    func addPoint(_ point: NSPoint) {
        points.append(point)
        if points.count > maxPoints {
            points.removeFirst(points.count - maxPoints)
        }
        needsDisplay = true
    }
}

// MARK: - Setup Overlay Window
let app = NSApplication.shared
app.setActivationPolicy(.accessory)

let screen = NSScreen.main!
let window = NSWindow(
    contentRect: screen.frame,
    styleMask: [.borderless],
    backing: .buffered,
    defer: false
)
window.level = .floating
window.backgroundColor = NSColor.clear
window.isOpaque = false
window.ignoresMouseEvents = true
window.collectionBehavior = [.canJoinAllSpaces, .fullScreenAuxiliary]

let view = TrailView(frame: screen.frame)
window.contentView = view
window.makeKeyAndOrderFront(nil)

// MARK: - Jiggle Logic
let displayID = CGMainDisplayID()
let screenWidth = CGFloat(CGDisplayPixelsWide(displayID))
let screenHeight = CGFloat(CGDisplayPixelsHigh(displayID))

var heading = Double.random(in: 0..<(2 * .pi))
var stepCount = 0
var jiggleTick = 0

// MARK: - Main Loop
var timer: Timer?

timer = Timer.scheduledTimer(withTimeInterval: 0.05, repeats: true) { _ in
    if !FileManager.default.fileExists(atPath: sentinelPath) {
        timer?.invalidate()
        exit(0)
    }

    // Track mouse for trail
    let mouseLoc = NSEvent.mouseLocation
    view.addPoint(mouseLoc)

    // Jiggle every ~40 ticks (2 seconds)
    jiggleTick += 1
    if jiggleTick >= 40 {
        jiggleTick = 0

        let distance = Double.random(in: 80...150)
        var dx = cos(heading) * distance
        var dy = sin(heading) * distance
        var newX = mouseLoc.x + CGFloat(dx)
        var newY = mouseLoc.y + CGFloat(dy)

        if newX < 50 || newX > screenWidth - 50 {
            dx = -dx
            newX = mouseLoc.x + CGFloat(dx)
            heading = .pi - heading
        }
        if newY < 50 || newY > screenHeight - 50 {
            dy = -dy
            newY = mouseLoc.y + CGFloat(dy)
            heading = -heading
        }

        let pt = CGPoint(x: newX, y: newY)
        CGEvent(mouseEventSource: nil, mouseType: .mouseMoved, mouseCursorPosition: pt, mouseButton: .left)?.post(tap: .cghidEventTap)

        if stepCount % 5 == 0 {
            heading += Double.random(in: 1.5...3.0)
        } else if stepCount % 3 == 0 {
            heading += Double.random(in: 0.8...1.5)
        } else {
            heading += Double.random(in: -0.5...0.5)
        }
        stepCount += 1
    }
}

app.run()
`;
}

function isProcessRunning(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

export default async function StartMouseJiggle() {
  // Check if already running
  try {
    await access(SENTINEL);
    await showToast({
      style: Toast.Style.Failure,
      title: "Mouse Jiggle Already Running",
    });
    return;
  } catch {
    // Not running, continue
  }

  // Remove any stale sentinel from a previous session
  try {
    await rm(SENTINEL);
  } catch {
    // ignore
  }

  // Give any running Swift process time to detect the sentinel removal
  await new Promise((resolve) => setTimeout(resolve, 300));

  await writeFile(SENTINEL, "", { flag: "w" });

  const { funMode } = getPreferenceValues<Preferences>();
  const swiftPath = join(SWIFT_DIR, "jiggle.swift");

  await mkdir(SWIFT_DIR, { recursive: true });

  const script = funMode
    ? buildFunScript(SENTINEL)
    : buildDefaultScript(SENTINEL);
  await writeFile(swiftPath, script, { flag: "w" });

  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Starting Mouse Jiggle...",
    message: "Compiling Swift script, please wait",
  });

  const child = spawn("/usr/bin/swift", [swiftPath], {
    detached: true,
    stdio: "ignore",
  });
  child.unref();

  // Give Swift a moment to start (handles cold JIT compilation)
  await new Promise((resolve) => setTimeout(resolve, 500));

  if (child.pid && isProcessRunning(child.pid)) {
    toast.style = Toast.Style.Success;
    toast.title = "Mouse Jiggle Started";
    toast.message = funMode
      ? "Fun mode: drawing mouse trail. Use Stop Mouse Jiggle to end."
      : "Running in background. Use Stop Mouse Jiggle to end.";
  } else {
    toast.style = Toast.Style.Failure;
    toast.title = "Failed to Start Mouse Jiggle";
    toast.message = "";
    await rm(SENTINEL).catch(() => {});
  }
}
