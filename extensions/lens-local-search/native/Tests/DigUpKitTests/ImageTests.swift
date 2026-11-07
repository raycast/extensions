import Foundation
import Testing
@testable import DigUpKit
#if canImport(ImageIO)
import CoreGraphics
import ImageIO
#endif

/// Pictures in the formats stb doesn't read, and a JPEG (Pictures/, from scripts/testbed/make_test_pictures.swift): a
/// 400×240 pattern of four colored quadrants (red, green above blue, yellow) with a DateTimeOriginal, stored turned
/// (orientation 6) except the AVIF. ImageIO reads them on macOS, stb or ffmpeg elsewhere: each must hand the model the
/// picture as it's shown, and the date.
@Suite struct ImageTests {
    static let pictures = URL(fileURLWithPath: #filePath).deletingLastPathComponent().appendingPathComponent("Pictures")
    let folder: URL = {
        let url = FileManager.default.temporaryDirectory.appendingPathComponent("DigUpTests-\(UUID().uuidString)")
        try? FileManager.default.createDirectory(at: url, withIntermediateDirectories: true)
        return url
    }()

    @Test(arguments: ["pattern-o6.jpg", "pattern-o6.heic", "pattern-o6.webp", "pattern-o6.tiff", "pattern.avif"])
    func preparedAsShown(_ name: String) throws {
        let prepared = try ImageExtractor.prepare(Self.pictures.appendingPathComponent(name), maxPixel: 1024,
                                                  minSide: 256, to: folder, png: true)
        #expect(Set([prepared.width, prepared.height]) == [400, 240])
        #expect(prepared.taken == "2024:05:17 10:30:00")
        let shown = try Self.decode(prepared.path)
        if name.contains("-o6") {   // turned 90° clockwise: blue and red on top, yellow and green below
            #expect(shown.width == 240 && shown.height == 400)
            #expect(shown.quadrants == ["B", "R", "Y", "G"])
        } else {
            #expect(shown.width == 400 && shown.height == 240)
            #expect(shown.quadrants == ["R", "G", "B", "Y"])
        }
    }

    @Test(arguments: ["pattern-o6.jpg", "pattern-o6.heic", "pattern-o6.webp"])
    func smallPicturesAreSkipped(_ name: String) {
        #expect(throws: ExtractError.self) {
            try ImageExtractor.prepare(Self.pictures.appendingPathComponent(name), maxPixel: 1024, minSide: 401,
                                       to: folder, png: true)
        }
    }

    #if canImport(AppKit)
    @Test func vectorPicturesAreDrawn() throws {
        // An SVG, which ImageIO doesn't open: red on the left, blue on the right, 800×400 points.
        let chart = folder.appendingPathComponent("chart.svg")
        try ##"<svg xmlns="http://www.w3.org/2000/svg" width="800" height="400"><rect width="400" height="400" fill="#f00"/><rect x="400" width="400" height="400" fill="#00f"/></svg>"##
            .write(to: chart, atomically: true, encoding: .utf8)
        let prepared = try ImageExtractor.prepare(chart, maxPixel: 1024, minSide: 256, to: folder, png: true)
        #expect(prepared.width == 800 && prepared.height == 400)
        let shown = try Self.decode(prepared.path)
        #expect(shown.width == 1024 && shown.height == 512)
        #expect(shown.quadrants == ["R", "B", "R", "B"])
        // An icon is still too small to say much.
        let icon = folder.appendingPathComponent("icon.svg")
        try ##"<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24"><rect width="24" height="24" fill="#0f0"/></svg>"##
            .write(to: icon, atomically: true, encoding: .utf8)
        do {
            _ = try ImageExtractor.prepare(icon, maxPixel: 1024, minSide: 256, to: folder, png: true)
            Issue.record("a 24-point icon was read")
        } catch {
            #expect("\(error)" == "small image 24×24")
        }
    }
    #endif

    /// A picture's size and the color in the middle of each quadrant (top left, top right, bottom left, bottom right),
    /// as R, G, B or Y.
    static func decode(_ path: String) throws -> (width: Int, height: Int, quadrants: [String]) {
        let (width, height, rgb) = try pixels(path)
        let quadrants = [(1, 1), (3, 1), (1, 3), (3, 3)].map { (qx, qy) -> String in
            let i = ((qy * height / 4) * width + qx * width / 4) * 3
            let high = (rgb[i] > 128, rgb[i + 1] > 128, rgb[i + 2] > 128)
            switch high {
            case (true, false, false): return "R"
            case (false, true, false): return "G"
            case (false, false, true): return "B"
            case (true, true, false): return "Y"
            default: return "(\(rgb[i]),\(rgb[i + 1]),\(rgb[i + 2]))"
            }
        }
        return (width, height, quadrants)
    }

    /// Packed 8-bit RGB, decoded by the system's own reader.
    static func pixels(_ path: String) throws -> (Int, Int, [UInt8]) {
        #if canImport(ImageIO)
        guard let source = CGImageSourceCreateWithURL(URL(fileURLWithPath: path) as CFURL, nil),
              let image = CGImageSourceCreateImageAtIndex(source, 0, nil) else { throw ExtractError.unreadable(path) }
        let (width, height) = (image.width, image.height)
        var rgba = [UInt8](repeating: 0, count: width * height * 4)
        guard let context = CGContext(data: &rgba, width: width, height: height, bitsPerComponent: 8,
                                      bytesPerRow: width * 4, space: CGColorSpace(name: CGColorSpace.sRGB)!,
                                      bitmapInfo: CGImageAlphaInfo.noneSkipLast.rawValue)
        else { throw ExtractError.unreadable(path) }
        context.draw(image, in: CGRect(x: 0, y: 0, width: width, height: height))
        var rgb = [UInt8]()
        rgb.reserveCapacity(width * height * 3)
        for i in stride(from: 0, to: rgba.count, by: 4) { rgb += rgba[i..<(i + 3)] }
        return (width, height, rgb)
        #else
        guard let image = RGBImage.load(path) else { throw ExtractError.unreadable(path) }
        return (image.width, image.height, image.pixels)
        #endif
    }
}
