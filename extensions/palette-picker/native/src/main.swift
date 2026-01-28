import AppKit

guard #available(OSX 10.15, *) else {
  print("NSColorSampler requires macOS >= 10.15")
  exit(1)
}

struct RGBA: Encodable {
  var r: Float;
  var g: Float;
  var b: Float;
  var a: Float;
}

NSColorSampler().show { selectedColor in
  guard let color = selectedColor?.usingColorSpace(NSColorSpace.sRGB) else {
    print("No color selected")
    exit(1)
  }
    
  let rgba = RGBA(
    r: Float(color.redComponent * 255),
    g: Float(color.greenComponent * 255),
    b: Float(color.blueComponent * 255),
    a: Float(color.alphaComponent)
  )
  
  guard let json = try? JSONEncoder().encode(rgba) else {
    print("Failed to encode object")
    exit(1)
  }
  guard let jsonString = String(data: json, encoding: .utf8) else {
    print("Failed to stringify object")
    exit(1)
  }
  
  print(jsonString)
  exit(0)
}

RunLoop.main.run()
