import CoreGraphics
import Foundation

struct FlightPose {
  let center: CGPoint
  let scale: CGFloat
  let rotation: CGFloat
  let liftThrust: Float
  let spinThrust: Float
  let counterThrust: Float
}

// Animation storyboard, seconds after the shared visual/audio start:
// 0.00  pressurize the jets
// 0.18  powered vertical lift
// 0.70  begin the roll after gaining height
// 0.90  float near the apex while rotating
// 1.30  opposite jets brake the rotation
// 1.72  finish upright, descend under control
// 2.34  touch down and settle
// 2.65  reveal the live window
enum FlightTiming {
  static let liftOff = 0.18
  static let apex = 0.90
  static let rollStart = 0.70
  static let counterStart = 1.30
  static let rollEnd = 1.72
  static let descent = 1.55
  static let touchdown = 2.34
  static let duration = 2.65

  static func smooth(_ value: Double) -> Double {
    let value = min(1, max(0, value))
    return value * value * (3 - 2 * value)
  }

  static func pulse(_ time: Double, start: Double, peak: Double, release: Double, end: Double) -> Float {
    Float(smooth((time - start) / (peak - start)) * (1 - smooth((time - release) / (end - release))))
  }

  static func thrust(at time: Double) -> (lift: Float, spin: Float, counter: Float) {
    let launch = pulse(time, start: 0.04, peak: liftOff, release: 0.40, end: 0.68)
    let landing = pulse(time, start: 1.88, peak: 2.12, release: touchdown, end: 2.52)
    let spin = pulse(time, start: rollStart, peak: 0.86, release: 1.02, end: 1.24)
    let counter = pulse(time, start: counterStart, peak: 1.44, release: 1.57, end: rollEnd)
    return (max(launch, landing), spin, counter)
  }
}

struct FlightPath {
  static let duration = FlightTiming.duration
  let window: CGRect
  let stage: CGRect

  func pose(at progress: Double) -> FlightPose {
    // A window hanging off the display may keep its full size; it just can't grow past it.
    let stage = stage.union(window)
    let time = min(1, max(0, progress)) * FlightTiming.duration
    let origin = CGPoint(x: window.midX, y: window.midY)
    let thrust = FlightTiming.thrust(at: time)
    if time >= FlightTiming.touchdown {
      let settle = (time - FlightTiming.touchdown) / (FlightTiming.duration - FlightTiming.touchdown)
      let rebound = time >= FlightTiming.duration ? 0 : sin(settle * .pi) * exp(-3 * settle)
      let bounce = rebound * min(3, max(0, stage.maxY - window.maxY))
      return FlightPose(center: CGPoint(x: origin.x, y: origin.y + bounce), scale: 1,
                        rotation: 2 * .pi, liftThrust: thrust.lift, spinThrust: 0, counterThrust: 0)
    }

    let rise = FlightTiming.smooth((time - FlightTiming.liftOff) / (FlightTiming.apex - FlightTiming.liftOff))
    let fall = FlightTiming.smooth((time - FlightTiming.descent) / (FlightTiming.touchdown - FlightTiming.descent))
    let altitude = rise * (1 - fall)
    let lift = min(180, max(0, stage.maxY - origin.y - window.height * 0.42 - 14))
    // A small sideways drift replaces the old sweep all the way to screen center.
    let center = CGPoint(x: origin.x + (stage.midX - origin.x) * 0.16 * altitude,
                         y: origin.y + lift * altitude)
    let rotation = FlightTiming.smooth((time - FlightTiming.rollStart) / (FlightTiming.rollEnd - FlightTiming.rollStart)) * 2 * .pi
    let halfWidth = (abs(cos(rotation)) * window.width + abs(sin(rotation)) * window.height) / 2
    let halfHeight = (abs(sin(rotation)) * window.width + abs(cos(rotation)) * window.height) / 2
    let availableX = max(1, min(center.x - stage.minX, stage.maxX - center.x))
    let availableY = max(1, min(center.y - stage.minY, stage.maxY - center.y))
    let scale = min(1 - 0.18 * altitude, availableX / halfWidth, availableY / halfHeight)
    return FlightPose(center: center, scale: scale, rotation: rotation,
                      liftThrust: thrust.lift, spinThrust: thrust.spin, counterThrust: thrust.counter)
  }
}

// ScreenCaptureKit uses a top-left origin; AppKit uses the main display's bottom-left.
func appKitFrame(_ frame: CGRect, mainDisplayHeight: CGFloat) -> CGRect {
  CGRect(x: frame.minX, y: mainDisplayHeight - frame.maxY, width: frame.width, height: frame.height)
}

// Index of the frame sharing the most area with `frame`, or nil when none overlaps it.
func largestOverlap(of frame: CGRect, in frames: [CGRect]) -> Int? {
  let areas = frames.map { candidate -> CGFloat in
    let overlap = candidate.intersection(frame)
    return overlap.isNull ? 0 : overlap.width * overlap.height
  }
  guard let best = areas.indices.max(by: { areas[$0] < areas[$1] }), areas[best] > 0 else { return nil }
  return best
}
