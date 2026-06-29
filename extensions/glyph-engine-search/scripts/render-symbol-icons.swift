#!/usr/bin/env swift

import AppKit
import Foundation

struct SearchIndex: Decodable {
    let symbols: [SymbolEntry]
}

struct SymbolEntry: Decodable {
    let name: String
    let icon: String
}

private let arguments = CommandLine.arguments
guard arguments.count == 3 else {
    fputs("Usage: render-symbol-icons.swift <search-index.json> <assets-directory>\n", stderr)
    exit(2)
}

let indexURL = URL(fileURLWithPath: arguments[1])
let assetsURL = URL(fileURLWithPath: arguments[2], isDirectory: true)
let decoder = JSONDecoder()
let index = try decoder.decode(SearchIndex.self, from: Data(contentsOf: indexURL))
let fileManager = FileManager.default

try fileManager.createDirectory(at: assetsURL, withIntermediateDirectories: true)

let canvasSize = NSSize(width: 64, height: 64)
let symbolPointSize: CGFloat = 42
let symbolConfiguration = NSImage.SymbolConfiguration(pointSize: symbolPointSize, weight: .regular)
var renderedCount = 0
var skippedCount = 0
var failedNames: [String] = []

func render(symbolName: String, to outputURL: URL) -> Bool {
    guard let baseImage = NSImage(systemSymbolName: symbolName, accessibilityDescription: nil),
          let image = baseImage.withSymbolConfiguration(symbolConfiguration) else {
        return false
    }

    guard let bitmap = NSBitmapImageRep(
        bitmapDataPlanes: nil,
        pixelsWide: Int(canvasSize.width),
        pixelsHigh: Int(canvasSize.height),
        bitsPerSample: 8,
        samplesPerPixel: 4,
        hasAlpha: true,
        isPlanar: false,
        colorSpaceName: .deviceRGB,
        bytesPerRow: 0,
        bitsPerPixel: 0
    ), let context = NSGraphicsContext(bitmapImageRep: bitmap) else {
        return false
    }

    NSGraphicsContext.saveGraphicsState()
    NSGraphicsContext.current = context
    defer { NSGraphicsContext.restoreGraphicsState() }

    context.cgContext.clear(CGRect(origin: .zero, size: canvasSize))
    NSColor.clear.setFill()
    NSRect(origin: .zero, size: canvasSize).fill()
    NSColor.black.set()

    let imageSize = image.size
    let scale = min(canvasSize.width / imageSize.width, canvasSize.height / imageSize.height)
    let drawSize = NSSize(width: imageSize.width * scale, height: imageSize.height * scale)
    let drawRect = NSRect(
        x: (canvasSize.width - drawSize.width) / 2,
        y: (canvasSize.height - drawSize.height) / 2,
        width: drawSize.width,
        height: drawSize.height
    )
    image.draw(in: drawRect, from: .zero, operation: .sourceOver, fraction: 1, respectFlipped: false, hints: nil)

    guard let pngData = bitmap.representation(using: .png, properties: [:]) else {
        return false
    }

    do {
        try pngData.write(to: outputURL, options: .atomic)
        return true
    } catch {
        return false
    }
}

for symbol in index.symbols {
    let outputURL = assetsURL.appendingPathComponent(symbol.icon)
    if fileManager.fileExists(atPath: outputURL.path) {
        skippedCount += 1
        continue
    }

    try fileManager.createDirectory(at: outputURL.deletingLastPathComponent(), withIntermediateDirectories: true)
    if render(symbolName: symbol.name, to: outputURL) {
        renderedCount += 1
    } else {
        failedNames.append(symbol.name)
    }
}

print("Rendered \(renderedCount) SF Symbol icon(s), skipped \(skippedCount) existing icon(s).")
if !failedNames.isEmpty {
    print("Could not render \(failedNames.count) SF Symbol icon(s): \(failedNames.prefix(20).joined(separator: ", "))")
}
