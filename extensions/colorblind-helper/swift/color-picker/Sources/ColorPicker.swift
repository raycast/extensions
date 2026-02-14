import AppKit
import RaycastSwiftMacros

struct PickedColor: Encodable {
    let red: Float
    let green: Float
    let blue: Float
    let alpha: Float
    let colorSpace: String
}

@raycast func pickColor() async -> PickedColor? {
    let colorSampler = NSColorSampler()
    guard let color = await colorSampler.sample()?.usingColorSpace(.sRGB) else {
        return nil
    }
    return PickedColor(
        red: Float(color.redComponent),
        green: Float(color.greenComponent),
        blue: Float(color.blueComponent),
        alpha: Float(color.alphaComponent),
        colorSpace: "srgb"
    )
}
