import AppKit
import RaycastSwiftMacros

/// Opens the native macOS eyedropper and returns the picked color as an sRGB hex string (`#rrggbb`).
/// Returns `nil` when the user cancels with Escape.
@raycast func pickColor() async -> String? {
  let sampler = NSColorSampler()
  guard let color = await sampler.sample()?.usingColorSpace(.sRGB) else { return nil }

  func channel(_ value: CGFloat) -> Int {
    Int((min(max(value, 0), 1) * 255).rounded())
  }

  return String(
    format: "#%02x%02x%02x",
    channel(color.redComponent),
    channel(color.greenComponent),
    channel(color.blueComponent)
  )
}
