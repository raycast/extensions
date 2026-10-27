import AppKit
import QuartzCore

@main
struct ThrusterTests {
  @MainActor
  static func main() {
    func pose(rotation: CGFloat = 0, lift: Float = 0, spin: Float = 0, counter: Float = 0) -> FlightPose {
      FlightPose(center: CGPoint(x: 700, y: 450), scale: 0.75, rotation: rotation,
                 liftThrust: lift, spinThrust: spin, counterThrust: counter)
    }
    func near(_ a: CGFloat, _ b: CGFloat) { assert(abs(a - b) < 0.00001) }

    for size in [CGSize(width: 800, height: 600), CGSize(width: 100, height: 1200), CGSize(width: 1400, height: 100)] {
      for thruster in Thruster.allCases {
        let upright = thruster.position(in: size, pose: pose())
        let quarter = thruster.position(in: size, pose: pose(rotation: .pi / 2))
        near(quarter.x - 700, -(upright.y - 450))
        near(quarter.y - 450, upright.x - 700)
        let inverted = thruster.position(in: size, pose: pose(rotation: .pi))
        near(inverted.x + upright.x, 1400)
        near(inverted.y + upright.y, 900)

        for step in 0...360 {
          let p = pose(rotation: CGFloat(step) * .pi / 180)
          let origin = thruster.position(in: size, pose: p)
          let angle = thruster.angle(in: size, pose: p)
          let x = origin.x - p.center.x, y = origin.y - p.center.y
          // Exhaust always points away from the window, including when inverted.
          assert(x * cos(angle) + y * sin(angle) > 0)
          // Reaction force is opposite exhaust. The selected diagonal must apply
          // the intended torque at every angle, regardless of the window aspect ratio.
          let torque = x * -sin(angle) - y * -cos(angle)
          if thruster.power(for: pose(spin: 1)) > 0 { assert(torque > 0) }
          if thruster.power(for: pose(counter: 1)) > 0 { assert(torque < 0) }
        }
      }
      let lift = Thruster.allCases.filter { $0.power(for: pose(lift: 1)) > 0 }
      assert(lift == [.bottomLeft, .bottomRight])
      let angles = lift.map { $0.exhaustAngle(in: size) }
      near(cos(angles[0]) + cos(angles[1]), 0)
      assert(angles.allSatisfy { sin($0) < 0 })
    }

    let stage = CALayer()
    stage.bounds = CGRect(x: 0, y: 0, width: 1440, height: 900)
    let context = CGContext(data: nil, width: 2, height: 2, bitsPerComponent: 8, bytesPerRow: 0,
                            space: CGColorSpaceCreateDeviceRGB(), bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue)!
    let samples = [pose(lift: 1), pose(rotation: .pi / 2, spin: 1), pose(rotation: .pi, counter: 1)]
    let jets = addThrusters(to: stage, windowSize: CGSize(width: 800, height: 600),
                           poses: samples, particle: context.makeImage()!, start: 100)
    assert(jets.count == 4)
    for jet in jets {
      assert(jet.superlayer === stage && CATransform3DIsIdentity(jet.transform))
      // No position or transform animation may move already-emitted particles.
      assert(jet.animation(forKey: "position") == nil && jet.animation(forKey: "transform.rotation.z") == nil)
      assert(jet.emitterCells?.first?.name == "air")
      for key in ["emitterPosition", "emitterCells.air.emissionLongitude", "birthRate", "velocity"] {
        let animation = jet.animation(forKey: key) as! CAKeyframeAnimation
        assert(animation.beginTime == 100 && animation.duration == FlightPath.duration)
        assert(animation.values?.count == samples.count)
      }
    }
    print("Thruster checks passed: four corner mounts, outward exhaust, rotation/scale, torque signs, and independent smoke layers.")
  }
}
