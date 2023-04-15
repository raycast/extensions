import AppKit

guard #available(OSX 10.15, *) else {
  print("macOS 10.15 or greater required")
  exit(1)
}

let colorSampler = NSColorSampler()
colorSampler.show { selectedColor in
  guard let color = selectedColor else {
    print("No color selected")
    exit(1)
  }

  let colorJson = [
    "alpha": lroundf(Float(color.alphaComponent) * 0xFF), 
    "red": lroundf(Float(color.redComponent) * 0xFF), 
    "green": lroundf(Float(color.greenComponent) * 0xFF), 
    "blue": lroundf(Float(color.blueComponent) * 0xFF)
  ]
  guard let serializedColor = try? JSONSerialization.data(withJSONObject: colorJson, options: .prettyPrinted) else {
    print("Failed to serialize color")
    exit(1)
  }

  guard let colorString = String(data: serializedColor, encoding: .utf8) else {
    print("Failed to convert color to string")
    exit(1)
  }
  
  print(colorString)
  exit(0)
}

RunLoop.main.run()