import CoreGraphics
import Foundation

@main
struct FlightPathTests {
  static func main() {
    let stage = CGRect(x: 0, y: 0, width: 1440, height: 900)
    let window = CGRect(x: 200, y: 120, width: 800, height: 600)
    let path = FlightPath(window: window, stage: stage)
    let start = path.pose(at: 0)
    let end = path.pose(at: 1)
    assert(start.center == CGPoint(x: window.midX, y: window.midY))
    assert(abs(end.center.x - start.center.x) < 0.001 && abs(end.center.y - start.center.y) < 0.001)
    assert(start.scale == 1 && end.scale == 1)
    assert(start.rotation == 0 && abs(end.rotation - 2 * .pi) < 0.001)
    assert(end.liftThrust == 0 && end.spinThrust == 0 && end.counterThrust == 0)
    func pose(atSeconds time: Double) -> FlightPose { path.pose(at: time / FlightPath.duration) }
    let liftOff = pose(atSeconds: FlightTiming.liftOff)
    assert(liftOff.center == start.center && liftOff.rotation == 0 && liftOff.liftThrust > 0)
    let rollStart = pose(atSeconds: FlightTiming.rollStart)
    assert(rollStart.center.y > start.center.y + 50 && rollStart.rotation == 0)
    let inverted = pose(atSeconds: (FlightTiming.rollStart + FlightTiming.rollEnd) / 2)
    assert(abs(inverted.rotation - .pi) < 0.001)
    assert(inverted.center == pose(atSeconds: FlightTiming.apex).center)
    assert(pose(atSeconds: 0.95).spinThrust > 0 && pose(atSeconds: 0.95).counterThrust == 0)
    assert(pose(atSeconds: 1.48).counterThrust > 0 && pose(atSeconds: 1.48).spinThrust == 0)
    let landing = pose(atSeconds: 2.2)
    assert(abs(landing.rotation - 2 * .pi) < 0.001 && landing.liftThrust > 0)
    assert(landing.center.y < inverted.center.y && landing.center.y > start.center.y)
    let touchdown = pose(atSeconds: FlightTiming.touchdown)
    assert(touchdown.center == start.center && touchdown.scale == 1)

    for frame in [window, CGRect(x: 0, y: 0, width: 1440, height: 900),
                  CGRect(x: 1100, y: 600, width: 340, height: 300)] {
      let path = FlightPath(window: frame, stage: stage)
      var previousRotation: CGFloat = 0
      for sample in 0...1000 {
        let pose = path.pose(at: Double(sample) / 1000)
        let halfWidth = (abs(cos(pose.rotation)) * frame.width + abs(sin(pose.rotation)) * frame.height) * pose.scale / 2
        let halfHeight = (abs(sin(pose.rotation)) * frame.width + abs(cos(pose.rotation)) * frame.height) * pose.scale / 2
        assert(pose.scale > 0 && pose.scale <= 1)
        assert(pose.rotation >= previousRotation && pose.rotation <= 2 * .pi)
        previousRotation = pose.rotation
        assert(pose.center.x - halfWidth >= -0.001 && pose.center.x + halfWidth <= stage.width + 0.001)
        assert(pose.center.y - halfHeight >= -0.001 && pose.center.y + halfHeight <= stage.height + 0.001)
      }
    }
    // Partly off-screen windows start and land at full size, staying within display ∪ window.
    for frame in [CGRect(x: -300, y: 200, width: 800, height: 600), CGRect(x: 1000, y: 500, width: 800, height: 600)] {
      let path = FlightPath(window: frame, stage: stage)
      let bounds = stage.union(frame)
      assert(path.pose(at: 0).scale == 1 && path.pose(at: 1).scale == 1)
      for sample in 0...1000 {
        let pose = path.pose(at: Double(sample) / 1000)
        let halfWidth = (abs(cos(pose.rotation)) * frame.width + abs(sin(pose.rotation)) * frame.height) * pose.scale / 2
        assert(pose.scale > 0.3 && pose.scale <= 1)
        assert(pose.center.x - halfWidth >= bounds.minX - 0.001 && pose.center.x + halfWidth <= bounds.maxX + 0.001)
      }
    }
    let displays = [CGRect(x: 0, y: 0, width: 1440, height: 900), CGRect(x: 1440, y: 0, width: 1920, height: 1080)]
    assert(largestOverlap(of: CGRect(x: 1300, y: 100, width: 800, height: 600), in: displays) == 1)
    assert(largestOverlap(of: CGRect(x: -100, y: 100, width: 800, height: 600), in: displays) == 0)
    assert(largestOverlap(of: CGRect(x: 5000, y: 100, width: 800, height: 600), in: displays) == nil)
    assert(appKitFrame(CGRect(x: -1200, y: -200, width: 800, height: 600), mainDisplayHeight: 900)
           == CGRect(x: -1200, y: 500, width: 800, height: 600))
    print("Native checks passed: lift before roll, counter-thrust, upright landing, full rotation, screen bounds, off-screen windows, display choice, and display coordinates.")
  }
}
