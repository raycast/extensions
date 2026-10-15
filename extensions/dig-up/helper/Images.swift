// Pictures for the model: the scratch copy DigUp's ImageExtractor.prepare makes (ImageIO, AppKit for vector pictures),
// the RGB pixels llama.cpp would read from it, and the final size. DigUp: Extractors+Apple.swift, ImageSizing.swift.
import AppKit
import Foundation
import ImageIO
import UniformTypeIdentifiers
import Vision

/// Packed 8-bit RGB: the pixels llama.cpp's decoder (stb_image) reads from a file.
struct RGBImage {
    let width: Int
    let height: Int
    var bytes: [UInt8]
}

enum Pictures {
    static let sRGB = CGColorSpace(name: CGColorSpace.sRGB)!

    // MARK: Pixels

    /// The image's pixel numbers as stored. stb ignores color profiles and alpha, so the image is drawn in its own
    /// color space (no conversion) and un-premultiplied; a gray image keeps its gray values on all three channels.
    static func decodeRGB(_ image: CGImage) -> RGBImage? {
        let width = image.width, height = image.height
        guard width > 0, height > 0 else { return nil }
        let opaque = [CGImageAlphaInfo.none, .noneSkipFirst, .noneSkipLast].contains(image.alphaInfo)
        if image.colorSpace?.model == .monochrome, opaque, let gray = decodeGray(image) { return gray }
        var space = sRGB
        if let own = image.colorSpace, own.model == .rgb { space = own }
        func makeContext(_ space: CGColorSpace) -> CGContext? {
            CGContext(data: nil, width: width, height: height, bitsPerComponent: 8, bytesPerRow: width * 4, space: space,
                      bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue)
        }
        guard let context = makeContext(space) ?? makeContext(sRGB), let data = context.data else { return nil }
        context.draw(image, in: CGRect(x: 0, y: 0, width: width, height: height))
        let pixels = data.bindMemory(to: UInt8.self, capacity: width * height * 4)
        var out = [UInt8](repeating: 0, count: width * height * 3)
        out.withUnsafeMutableBufferPointer { out in
            for i in 0..<(width * height) {
                let alpha = Int(pixels[i * 4 + 3])
                for c in 0..<3 {
                    let value = Int(pixels[i * 4 + c])
                    out[i * 3 + c] = alpha == 255 || alpha == 0 ? UInt8(value)
                        : UInt8(min(255, (value * 255 + alpha / 2) / alpha))
                }
            }
        }
        return RGBImage(width: width, height: height, bytes: out)
    }

    private static func decodeGray(_ image: CGImage) -> RGBImage? {
        let width = image.width, height = image.height
        guard let space = image.colorSpace,
              let context = CGContext(data: nil, width: width, height: height, bitsPerComponent: 8, bytesPerRow: width,
                                      space: space, bitmapInfo: CGImageAlphaInfo.none.rawValue),
              let data = context.data else { return nil }
        context.draw(image, in: CGRect(x: 0, y: 0, width: width, height: height))
        let gray = data.bindMemory(to: UInt8.self, capacity: width * height)
        var out = [UInt8](repeating: 0, count: width * height * 3)
        for i in 0..<(width * height) { out[i * 3] = gray[i]; out[i * 3 + 1] = gray[i]; out[i * 3 + 2] = gray[i] }
        return RGBImage(width: width, height: height, bytes: out)
    }

    static func cgImage(_ rgb: RGBImage) -> CGImage? {
        guard let provider = CGDataProvider(data: Data(rgb.bytes) as CFData) else { return nil }
        return CGImage(width: rgb.width, height: rgb.height, bitsPerComponent: 8, bitsPerPixel: 24,
                       bytesPerRow: rgb.width * 3, space: sRGB,
                       bitmapInfo: CGBitmapInfo(rawValue: CGImageAlphaInfo.none.rawValue), provider: provider,
                       decode: nil, shouldInterpolate: false, intent: .defaultIntent)
    }

    // MARK: Reading and writing

    static func readFull(_ url: URL) -> CGImage? {
        guard let source = CGImageSourceCreateWithURL(url as CFURL, nil) else { return nil }
        return CGImageSourceCreateImageAtIndex(source, 0, nil)
    }

    static func decode(_ data: Data) -> CGImage? {
        guard let source = CGImageSourceCreateWithData(data as CFData, nil) else { return nil }
        return CGImageSourceCreateImageAtIndex(source, 0, nil)
    }

    /// The pixels the model's decoder reads from an encoded picture: stb_image's when llama.cpp's is loaded, else
    /// ImageIO's (`imageIO` forces it, for tests).
    static func modelPixels(_ data: Data, imageIO: Bool = false) -> RGBImage? {
        if !imageIO, let rgb = ModelDecoder.decode(data) { return rgb }
        return decode(data).flatMap(decodeRGB)
    }

    static func modelPixels(ofFileAt url: URL, imageIO: Bool = false) throws -> RGBImage {
        guard let data = try? Data(contentsOf: url), let rgb = modelPixels(data, imageIO: imageIO)
        else { throw ExtractError.unreadable("can't decode image") }
        return rgb
    }

    /// DigUp: ImageExtractor.write. JPEG at quality 0.9.
    static func encode(_ image: CGImage, png: Bool) -> Data? {
        let data = NSMutableData()
        let type = (png ? UTType.png : UTType.jpeg).identifier as CFString
        guard let destination = CGImageDestinationCreateWithData(data, type, 1, nil) else { return nil }
        let properties = png ? nil : [kCGImageDestinationLossyCompressionQuality: 0.9] as CFDictionary
        CGImageDestinationAddImage(destination, image, properties)
        return CGImageDestinationFinalize(destination) ? data as Data : nil
    }

    static func write(_ image: CGImage, to url: URL, png: Bool) throws {
        guard let data = encode(image, png: png) else { throw ExtractError.unreadable("can't encode image") }
        do { try data.write(to: url) } catch { throw ExtractError.unreadable("can't write \(url.lastPathComponent)") }
    }

    /// The picture on white, for formats without alpha.
    static func flattened(_ image: CGImage) -> CGImage {
        guard ![CGImageAlphaInfo.none, .noneSkipFirst, .noneSkipLast].contains(image.alphaInfo),
              let context = CGContext(data: nil, width: image.width, height: image.height, bitsPerComponent: 8,
                                      bytesPerRow: 0, space: sRGB,
                                      bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue) else { return image }
        let rect = CGRect(x: 0, y: 0, width: image.width, height: image.height)
        context.setFillColor(CGColor(red: 1, green: 1, blue: 1, alpha: 1))
        context.fill(rect)
        context.draw(image, in: rect)
        return context.makeImage() ?? image
    }

    static func makeFolder(_ path: String) throws -> URL {
        let url = URL(fileURLWithPath: path, isDirectory: true)
        try FileManager.default.createDirectory(at: url, withIntermediateDirectories: true)
        return url
    }

    // MARK: ImageExtractor.prepare

    struct Prepared {
        /// The scratch copy as the model's decoder would read it (after the JPEG round trip for photos).
        let pixels: RGBImage
        /// Stored pixel size (before the EXIF turn).
        let width: Int
        let height: Int
        let taken: String?
    }

    /// DigUp: ImageExtractor.prepare. ImageIO decodes straight to the thumbnail size, with the EXIF turn applied;
    /// pictures ImageIO can't open (SVG) are drawn with AppKit. DigUp writes the copy as a file; here it stays in memory,
    /// encoded and decoded the same way, so the model gets the same pixels.
    static func prepare(_ url: URL, maxPixel: Int, minSide: Int, png: Bool) throws -> Prepared {
        guard let source = CGImageSourceCreateWithURL(url as CFURL, [kCGImageSourceShouldCache: false] as CFDictionary),
              CGImageSourceGetType(source) != nil
        else { return try drawn(url, maxPixel: maxPixel, minSide: minSide, png: png) }
        let properties = CGImageSourceCopyPropertiesAtIndex(source, 0, nil) as? [CFString: Any] ?? [:]
        let width = properties[kCGImagePropertyPixelWidth] as? Int ?? 0
        let height = properties[kCGImagePropertyPixelHeight] as? Int ?? 0
        guard max(width, height) >= minSide else { throw ExtractError.tooSmall(width, height) }
        let options: [CFString: Any] = [
            kCGImageSourceCreateThumbnailFromImageAlways: true,
            kCGImageSourceThumbnailMaxPixelSize: maxPixel,
            kCGImageSourceCreateThumbnailWithTransform: true,
            kCGImageSourceShouldCacheImmediately: true,
        ]
        guard let thumbnail = CGImageSourceCreateThumbnailAtIndex(source, 0, options as CFDictionary)
        else { throw ExtractError.unreadable("can't decode image") }
        let exif = properties[kCGImagePropertyExifDictionary] as? [CFString: Any]
        let taken = exif?[kCGImagePropertyExifDateTimeOriginal] as? String
        return Prepared(pixels: try scratch(thumbnail, png: png), width: width, height: height, taken: taken)
    }

    /// A picture ImageIO can't read, like an SVG: AppKit draws it, straight at the size the model needs (a vector
    /// picture has no pixels of its own: its size in points stands for them). Transparent parts come out white.
    private static func drawn(_ url: URL, maxPixel: Int, minSide: Int, png: Bool) throws -> Prepared {
        let (bitmap, width, height) = try drawVector(url, maxPixel: maxPixel, minSide: minSide)
        return Prepared(pixels: try scratch(bitmap, png: png), width: width, height: height, taken: nil)
    }

    /// The picture drawn on white with its long side `maxPixel`, and its size in points.
    static func drawVector(_ url: URL, maxPixel: Int, minSide: Int = 0) throws -> (image: CGImage, width: Int, height: Int) {
        guard let image = NSImage(contentsOf: url), image.size.width > 0, image.size.height > 0
        else { throw ExtractError.unreadable("can't read this picture") }
        let (width, height) = (Int(image.size.width.rounded()), Int(image.size.height.rounded()))
        guard max(width, height) >= minSide else { throw ExtractError.tooSmall(width, height) }
        let scale = CGFloat(maxPixel) / max(image.size.width, image.size.height)
        let side = (max(1, Int((image.size.width * scale).rounded())), max(1, Int((image.size.height * scale).rounded())))
        guard let context = CGContext(data: nil, width: side.0, height: side.1, bitsPerComponent: 8, bytesPerRow: 0,
                                      space: CGColorSpaceCreateDeviceRGB(),
                                      bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue)
        else { throw ExtractError.unreadable("can't draw this picture") }
        context.setFillColor(CGColor(red: 1, green: 1, blue: 1, alpha: 1))
        context.fill(CGRect(x: 0, y: 0, width: side.0, height: side.1))
        NSGraphicsContext.saveGraphicsState()
        NSGraphicsContext.current = NSGraphicsContext(cgContext: context, flipped: false)
        image.draw(in: NSRect(x: 0, y: 0, width: side.0, height: side.1))
        NSGraphicsContext.restoreGraphicsState()
        guard let bitmap = context.makeImage() else { throw ExtractError.unreadable("can't draw this picture") }
        return (bitmap, width, height)
    }

    /// The scratch copy as the model reads it. DigUp writes photos and frames as JPEG (quality 0.9), which loses
    /// detail the model then sees, and llama.cpp decodes that with stb_image. A PNG copy is exact: no round trip.
    static func scratch(_ image: CGImage, png: Bool) throws -> RGBImage {
        if png {
            guard let rgb = decodeRGB(image) else { throw ExtractError.unreadable("can't decode image") }
            return rgb
        }
        guard let data = encode(image, png: false) else { throw ExtractError.unreadable("can't encode image") }
        guard let rgb = modelPixels(data) else { throw ExtractError.unreadable("can't decode image") }
        return rgb
    }

    // MARK: Sizing

    /// The pixels at the size the model gets for `budget` soft tokens (DigUp: LlamaEmbedder.load).
    static func size(_ rgb: RGBImage, budget: Int) throws -> RGBImage {
        guard let target = ImageSizing.targetSize(height: rgb.height, width: rgb.width, budget: budget)
        else { throw ExtractError.unreadable("image too thin to embed") }
        if target.height == rgb.height && target.width == rgb.width { return rgb }
        let bytes = ImageSizing.resizeBicubic(rgb.bytes, width: rgb.width, height: rgb.height,
                                              toWidth: target.width, toHeight: target.height)
        return RGBImage(width: target.width, height: target.height, bytes: bytes)
    }

    /// Sizes a decoded picture to `budget` and writes it as a PNG.
    static func sizeAndWrite(_ image: CGImage, budget: Int, to url: URL) throws -> RGBImage {
        guard let rgb = decodeRGB(image) else { throw ExtractError.unreadable("can't decode image") }
        return try sizeAndWrite(rgb, budget: budget, to: url)
    }

    static func sizeAndWrite(_ rgb: RGBImage, budget: Int, to url: URL) throws -> RGBImage {
        let sized = try size(rgb, budget: budget)
        guard let out = cgImage(sized) else { throw ExtractError.unreadable("can't encode image") }
        try write(out, to: url, png: true)
        return sized
    }
}

enum OCR {
    /// Apple Vision text recognition. Runs on the full-resolution image; accurate beats fast (DigUp, 2026-10-07).
    static func text(in image: CGImage) -> String {
        let request = VNRecognizeTextRequest()
        request.recognitionLevel = .accurate
        request.usesLanguageCorrection = true
        request.automaticallyDetectsLanguage = true
        try? VNImageRequestHandler(cgImage: image).perform([request])
        return (request.results ?? []).compactMap { $0.topCandidates(1).first?.string }.joined(separator: "\n")
    }

    /// Accurate recognition reads Arabic on this system (macOS 15 and later).
    static let readsArabic: Bool = {
        let request = VNRecognizeTextRequest()
        request.recognitionLevel = .accurate
        return (try? request.supportedRecognitionLanguages())?.contains { $0.hasPrefix("ar") } ?? false
    }()

    /// The text in the image at `url`, read at full resolution, EXIF turn not applied (as DigUp does).
    static func text(ofImageAt url: URL) -> String {
        Pictures.readFull(url).map(text(in:)) ?? ""
    }
}

enum ImageOps {
    /// `image`: DigUp's prepare, then the size the encoder gets, written as a PNG at `out`.
    static func image(_ a: Args) throws -> JSON {
        let url = URL(fileURLWithPath: try a.string("path"))
        let screenshot = a.bool("screenshot")
        let budget = try a.positiveInt("budget", max: maxBudget)
        let out = URL(fileURLWithPath: try a.string("out"))
        let prepared: Pictures.Prepared
        do {
            prepared = try Pictures.prepare(url, maxPixel: screenshot ? 1536 : 1024, minSide: try a.int("minSide", 256),
                                            png: screenshot)
        } catch ExtractError.tooSmall(let width, let height) {
            return ["tooSmall": true, "width": .int(width), "height": .int(height)]
        }
        let sized = try Pictures.sizeAndWrite(prepared.pixels, budget: budget, to: out)
        var reply: [String: JSON] = [
            "width": .int(prepared.width), "height": .int(prepared.height),
            "sized": ["width": .int(sized.width), "height": .int(sized.height)],
        ]
        if let taken = prepared.taken { reply["taken"] = .string(taken) }
        if a.bool("ocr") { reply["ocr"] = .string(OCR.text(ofImageAt: url)) }
        return .object(reply)
    }

    /// `size`: a prepared file (a frame, a page, a test picture), read as mtmd reads it, sized to a budget.
    static func size(_ a: Args) throws -> JSON {
        let rgb = try Pictures.modelPixels(ofFileAt: URL(fileURLWithPath: try a.string("path")))
        let sized = try Pictures.sizeAndWrite(rgb, budget: try a.positiveInt("budget", max: maxBudget),
                                              to: URL(fileURLWithPath: try a.string("out")))
        return ["width": .int(rgb.width), "height": .int(rgb.height),
                "sized": ["width": .int(sized.width), "height": .int(sized.height)]]
    }

    static func targetSizeTest(_ a: Args) throws -> JSON {
        guard let target = ImageSizing.targetSize(height: try a.positiveInt("height"), width: try a.positiveInt("width"),
                                                  budget: try a.positiveInt("budget", max: maxBudget))
        else { return ["target": nil] }
        return ["target": ["height": .int(target.height), "width": .int(target.width)]]
    }

    static func resizeTest(_ a: Args) throws -> JSON {
        let (width, height) = (try a.positiveInt("width", max: 256), try a.positiveInt("height", max: 256))
        guard let numbers = a.numbers("pixels"), numbers.count == width * height * 3
        else { throw HelperFailure("pixels must hold width × height × 3 numbers") }
        let bytes = ImageSizing.resizeBicubic(numbers.map { UInt8(clamping: Int($0)) }, width: width, height: height,
                                              toWidth: try a.positiveInt("toWidth", max: 256),
                                              toHeight: try a.positiveInt("toHeight", max: 256))
        return ["pixels": .array(bytes.map { .int(Int($0)) })]
    }

    /// The RGB the model's decoder would read at `points` ([[x, y], ...], from the top left) of a picture file.
    /// `imageIO` reads it with ImageIO instead of stb_image.
    static func pixelsTest(_ a: Args) throws -> JSON {
        let rgb = try Pictures.modelPixels(ofFileAt: URL(fileURLWithPath: try a.string("path")), imageIO: a.bool("imageIO"))
        let points = (a.raw["points"] as? [[NSNumber]]) ?? []
        let samples: [JSON] = try points.map { point in
            guard point.count == 2, (0..<rgb.width).contains(point[0].intValue), (0..<rgb.height).contains(point[1].intValue)
            else { throw HelperFailure("point outside the picture") }
            let i = (point[1].intValue * rgb.width + point[0].intValue) * 3
            return [.int(Int(rgb.bytes[i])), .int(Int(rgb.bytes[i + 1])), .int(Int(rgb.bytes[i + 2]))]
        }
        return ["width": .int(rgb.width), "height": .int(rgb.height), "rgb": .array(samples)]
    }
}
