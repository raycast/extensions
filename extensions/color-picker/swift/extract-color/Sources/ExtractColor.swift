import AppKit
import Foundation
import RaycastSwiftMacros

struct FinalColor: Codable {
    let hex: String
    let red: Int
    let green: Int
    let blue: Int
    let area: Double
    let hue: Double
    let saturation: Double
    let lightness: Double
    let intensity: Double
}

func shouldResizeImage(_ image: NSImage) -> Bool {
    let pixelCount = Int(image.size.width * image.size.height)
    let maxPixels = 1_000_000 // 1 million pixels (e.g., ~1000x1000)
    
    return pixelCount > maxPixels
}

func resizeImage(_ image: NSImage, maxDimension: CGFloat = 1000) -> NSImage {
    // Skip resize if image is already small enough
    if !shouldResizeImage(image) {
        return image
    }
    
    let scale = min(maxDimension / image.size.width, maxDimension / image.size.height)
    
    // If image is smaller than maxDimension, return original
    if scale >= 1.0 {
        return image
    }
    
    let newSize = NSSize(
        width: image.size.width * scale,
        height: image.size.height * scale
    )
    
    let resizedImage = NSImage(size: newSize)
    resizedImage.lockFocus()
    image.draw(in: NSRect(origin: .zero, size: newSize))
    resizedImage.unlockFocus()
    
    return resizedImage
}

func colorDistance(_ color1: NSColor, _ color2: NSColor) -> CGFloat {
    var r1: CGFloat = 0, g1: CGFloat = 0, b1: CGFloat = 0
    var r2: CGFloat = 0, g2: CGFloat = 0, b2: CGFloat = 0
    
    color1.usingColorSpace(NSColorSpace.sRGB)?.getRed(&r1, green: &g1, blue: &b1, alpha: nil)
    color2.usingColorSpace(NSColorSpace.sRGB)?.getRed(&r2, green: &g2, blue: &b2, alpha: nil)
    
    let rDiff = r1 - r2
    let gDiff = g1 - g2
    let bDiff = b1 - b2
    
    return sqrt(rDiff * rDiff + gDiff * gDiff + bDiff * bDiff)
}

func filterSimilarColors(_ colors: [(NSColor, Int)], similarityThreshold: CGFloat = 0.2) -> [(NSColor, Int)] {
    var filteredColors: [(NSColor, Int)] = []
    
    for color in colors {
        // Check if this color is too similar to any already filtered color
        let isSimilar = filteredColors.contains { existing in
            colorDistance(existing.0, color.0) < similarityThreshold
        }
        
        if !isSimilar {
            filteredColors.append(color)
        }
    }
    
    return filteredColors
}

func extractColors(from image: NSImage, count: Int, dominantOnly: Bool = false, skipSimilar: Bool = false) -> [FinalColor] {
    // Only resize if needed
    let processImage = shouldResizeImage(image) ? resizeImage(image) : image
    
    guard let cgImage = processImage.cgImage(forProposedRect: nil, context: nil, hints: nil) else {
        return []
    }
    
    let bitmapRep = NSBitmapImageRep(cgImage: cgImage)
    var colorCounts: [NSColor: Int] = [:]
    let width = bitmapRep.pixelsWide
    let height = bitmapRep.pixelsHigh
    let totalPixels = width * height
    
    // Sample pixels with adaptive step size
    let sampleStep = max(1, min(width, height) / 100)
    
    for x in stride(from: 0, to: width, by: sampleStep) {
        for y in stride(from: 0, to: height, by: sampleStep) {
            if let color = bitmapRep.colorAt(x: Int(x), y: Int(y)) {
                // Quantize colors to reduce noise
                let rgb = color.usingColorSpace(.sRGB)!
                var r: CGFloat = 0, g: CGFloat = 0, b: CGFloat = 0
                rgb.getRed(&r, green: &g, blue: &b, alpha: nil)
                
                // Round to nearest 5% to group similar colors
                let quantize: (CGFloat) -> CGFloat = { value in
                    return round(value * 20) / 20
                }
                
                let quantizedColor = NSColor(
                    red: quantize(r),
                    green: quantize(g),
                    blue: quantize(b),
                    alpha: 1.0
                )
                
                colorCounts[quantizedColor, default: 0] += 1
            }
        }
    }
    
    let sortedColors = colorCounts.sorted { $0.value > $1.value }
    
    // Filter similar colors if requested
    let workingColors = skipSimilar ? filterSimilarColors(sortedColors) : sortedColors
    
    // Convert threshold to Int for comparison
    let significantThreshold = Int(Double(totalPixels) * 0.01) // 1% of total pixels
    let filteredColors = dominantOnly 
        ? workingColors.filter { $0.1 > significantThreshold }
        : workingColors
    
    return filteredColors
        .prefix(count)
        .map { (color, count) in
            let rgb = color.usingColorSpace(NSColorSpace.sRGB)!
            var r: CGFloat = 0, g: CGFloat = 0, b: CGFloat = 0, h: CGFloat = 0, s: CGFloat = 0, l: CGFloat = 0
            rgb.getRed(&r, green: &g, blue: &b, alpha: nil)
            rgb.getHue(&h, saturation: &s, brightness: &l, alpha: nil)
            
            return FinalColor(
                hex: String(format: "#%02X%02X%02X", 
                    Int(r * 255), 
                    Int(g * 255), 
                    Int(b * 255)
                ),
                red: Int(r * 255),
                green: Int(g * 255),
                blue: Int(b * 255),
                area: Double(count) / Double(totalPixels) * 100,
                hue: Double(h * 360),
                saturation: Double(s * 100),
                lightness: Double(l * 100),
                intensity: (Double(r + g + b) / 3.0) * 100
            )
        }
}

@raycast func extractColor(
    filePath: String,
    count: Int = 5,
    dominantOnly: Bool = false
) throws -> [FinalColor] {
    guard let image = NSImage(contentsOfFile: filePath) else {
        throw "Failed to load image"
    }
    return extractColors(from: image, count: count, dominantOnly: dominantOnly, skipSimilar: true)
}

extension String: Swift.Error { }
