import AppKit
import CoreGraphics
import Foundation

// Turns a square app icon into a Raycast extension icon: trims the transparent
// margin macOS leaves around a squircle, squares the result and scales it to
// 512×512 so Raycast's own corner mask lines up with the artwork.
//
// Usage: swift scripts/make-icon.swift <source.png> <out.png> [size]

let arguments = CommandLine.arguments
guard arguments.count >= 3 else {
    FileHandle.standardError.write(Data("usage: make-icon.swift <source.png> <out.png> [size]\n".utf8))
    exit(2)
}

let sourcePath = arguments[1]
let outputPath = arguments[2]
let side = arguments.count > 3 ? (Int(arguments[3]) ?? 512) : 512

guard let source = NSImage(contentsOfFile: sourcePath),
      let image = source.cgImage(forProposedRect: nil, context: nil, hints: nil) else {
    FileHandle.standardError.write(Data("could not read \(sourcePath)\n".utf8))
    exit(1)
}

let width = image.width
let height = image.height
let bytesPerRow = width * 4
var pixels = [UInt8](repeating: 0, count: bytesPerRow * height)

guard let reader = CGContext(
    data: &pixels, width: width, height: height, bitsPerComponent: 8,
    bytesPerRow: bytesPerRow, space: CGColorSpace(name: CGColorSpace.sRGB)!,
    bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue
) else {
    FileHandle.standardError.write(Data("could not inspect \(sourcePath)\n".utf8))
    exit(1)
}
reader.draw(image, in: CGRect(x: 0, y: 0, width: width, height: height))

// Anything below this alpha is the drop shadow macOS adds, not the artwork.
let threshold: UInt8 = 200
var minX = width, minY = height, maxX = -1, maxY = -1
for y in 0..<height {
    for x in 0..<width where pixels[y * bytesPerRow + x * 4 + 3] > threshold {
        if x < minX { minX = x }
        if x > maxX { maxX = x }
        if y < minY { minY = y }
        if y > maxY { maxY = y }
    }
}

guard maxX >= minX, maxY >= minY else {
    FileHandle.standardError.write(Data("\(sourcePath) is fully transparent\n".utf8))
    exit(1)
}

// Square the crop around the artwork's centre, then clamp it to the image.
let artworkSide = max(maxX - minX + 1, maxY - minY + 1)
let centreX = CGFloat(minX + maxX + 1) / 2
let centreY = CGFloat(minY + maxY + 1) / 2
let square = CGFloat(artworkSide)
var originX = (centreX - square / 2).rounded()
var originY = (centreY - square / 2).rounded()
originX = min(max(0, originX), CGFloat(width) - square)
originY = min(max(0, originY), CGFloat(height) - square)

guard let cropped = image.cropping(
    to: CGRect(x: originX, y: originY, width: square, height: square)
) else {
    FileHandle.standardError.write(Data("could not crop \(sourcePath)\n".utf8))
    exit(1)
}

guard let output = CGContext(
    data: nil, width: side, height: side, bitsPerComponent: 8, bytesPerRow: 0,
    space: CGColorSpace(name: CGColorSpace.sRGB)!,
    bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue
) else {
    FileHandle.standardError.write(Data("could not create a \(side)×\(side) canvas\n".utf8))
    exit(1)
}

output.interpolationQuality = .high
output.draw(cropped, in: CGRect(x: 0, y: 0, width: side, height: side))

guard let rendered = output.makeImage(),
      let data = NSBitmapImageRep(cgImage: rendered).representation(using: .png, properties: [:]) else {
    FileHandle.standardError.write(Data("could not encode \(outputPath)\n".utf8))
    exit(1)
}
try data.write(to: URL(fileURLWithPath: outputPath))
print("wrote \(outputPath) from \(sourcePath) (\(Int(square))px crop → \(side)px)")
