import AppKit
import QuartzCore

enum Thruster: CaseIterable {
  case bottomLeft, bottomRight, topLeft, topRight

  private var left: Bool { self == .bottomLeft || self == .topLeft }
  private var bottom: Bool { self == .bottomLeft || self == .bottomRight }

  func mount(in size: CGSize) -> CGPoint {
    CGPoint(x: size.width * (left ? 0.12 : 0.88), y: bottom ? 0 : size.height)
  }

  func exhaustAngle(in size: CGSize) -> CGFloat {
    // Cant outward, but keep the thrust's torque direction on tall/narrow windows too.
    let cant = min(tan(14 * .pi / 180), 0.38 * size.width / size.height)
    return atan2(bottom ? -1 : 1, left ? -cant : cant)
  }

  func power(for pose: FlightPose) -> Float {
    let turn = self == .bottomRight || self == .topLeft ? pose.spinThrust : pose.counterThrust
    return max(bottom ? pose.liftThrust : 0, turn)
  }

  func position(in size: CGSize, pose: FlightPose) -> CGPoint {
    let local = mount(in: size)
    let x = (local.x - size.width / 2) * pose.scale
    let y = (local.y - size.height / 2) * pose.scale
    return CGPoint(x: pose.center.x + x * cos(pose.rotation) - y * sin(pose.rotation),
                   y: pose.center.y + x * sin(pose.rotation) + y * cos(pose.rotation))
  }

  func angle(in size: CGSize, pose: FlightPose) -> CGFloat {
    // Keep the angle unwrapped so keyframes never interpolate backward across +/- pi.
    exhaustAngle(in: size) + pose.rotation
  }
}

@MainActor
@discardableResult
func addThrusters(to stage: CALayer, windowSize: CGSize, poses: [FlightPose],
                  particle: CGImage, start: CFTimeInterval) -> [CAEmitterLayer] {
  Thruster.allCases.map { thruster in
    // Only the nozzle moves. The layer stays in screen coordinates, so particles
    // already emitted keep travelling independently of the window's later rotation.
    let emitter = CAEmitterLayer()
    emitter.frame = stage.bounds
    emitter.emitterShape = .point
    emitter.renderMode = .unordered
    emitter.birthRate = 0
    let air = CAEmitterCell()
    air.name = "air"
    air.contents = particle
    air.birthRate = 180
    air.lifetime = 0.26
    air.lifetimeRange = 0.05
    air.velocity = 380
    air.velocityRange = 60
    air.emissionRange = .pi / 18
    air.scale = 0.12
    air.scaleRange = 0.03
    air.scaleSpeed = 1.1
    air.alphaSpeed = -3.5
    air.color = NSColor(calibratedRed: 0.94, green: 0.97, blue: 1, alpha: 0.80).cgColor
    emitter.emitterCells = [air]
    stage.addSublayer(emitter)
    addAnimation(to: emitter, key: "emitterPosition",
                 values: poses.map { NSValue(point: thruster.position(in: windowSize, pose: $0)) }, start: start)
    addAnimation(to: emitter, key: "emitterCells.air.emissionLongitude",
                 values: poses.map { thruster.angle(in: windowSize, pose: $0) }, start: start)
    addAnimation(to: emitter, key: "birthRate", values: poses.map { thruster.power(for: $0) }, start: start)
    addAnimation(to: emitter, key: "velocity", values: poses.map { $0.scale }, start: start)
    return emitter
  }
}

@MainActor
func addAnimation(to layer: CALayer, key: String, values: [Any], start: CFTimeInterval) {
  let animation = CAKeyframeAnimation(keyPath: key)
  animation.values = values
  animation.duration = FlightPath.duration
  animation.beginTime = start
  animation.calculationMode = .linear
  animation.fillMode = .both
  animation.isRemovedOnCompletion = false
  layer.add(animation, forKey: key)
}
