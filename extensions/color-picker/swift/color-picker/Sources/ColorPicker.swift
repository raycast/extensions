import AppKit
import RaycastSwiftMacros

struct Color: Encodable {
  let red: Float
  let blue: Float
  let green: Float
  let alpha: Float
  let colorSpace: String
}

@raycast func pickColor() async -> Color? {
  let colorSampler = NSColorSampler()
  guard let color = await colorSampler.sample()?.usingColorSpace(.displayP3) else { return nil }

  return Color(
    red: Float(color.redComponent),
    blue: Float(color.blueComponent),
    green: Float(color.greenComponent),
    alpha: Float(color.alphaComponent),
    colorSpace: "p3"
  )
}
