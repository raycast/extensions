import AppKit
import RaycastSwiftMacros

struct Color: Encodable {
  let red: Int
  let blue: Int
  let green: Int
  let alpha: Int
}

@raycast func pickColor(_ workaround: Bool?) async -> Color? {
  let colorSampler = NSColorSampler()
  guard let color = await colorSampler.sample() else { return nil }

  return Color(
    red: lroundf(Float(color.redComponent) * 0xFF),
    blue: lroundf(Float(color.blueComponent) * 0xFF),
    green: lroundf(Float(color.greenComponent) * 0xFF),
    alpha: lroundf(Float(color.alphaComponent) * 0xFF)
  )
}
