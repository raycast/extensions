// Pictures of results for the preview: the picture itself, the PDF page that matched with the words marked, the video
// frame at the moment, a waveform with the matched stretch lit. DigUp: Previews.swift (the audio waveform is new: DigUp
// draws a timeline in SwiftUI there).
import AppKit
import AVFoundation
import Foundation
import ImageIO
import PDFKit
import QuickLookThumbnailing

enum Thumbs {
    static func make(_ a: Args) throws -> JSON {
        let url = URL(fileURLWithPath: try a.string("path"))
        let out = URL(fileURLWithPath: try a.string("out"))
        let maxPixel = max(16, try a.positiveInt("maxPixel", max: 8192))
        try FileManager.default.createDirectory(at: out.deletingLastPathComponent(), withIntermediateDirectories: true)
        let png = out.pathExtension.lowercased() == "png"

        // DigUp: Previews.load. When the moment, the page or the waveform can't be drawn, the file's own picture stands in.
        var image: CGImage?
        do {
            if let seconds = a.optDouble("time"), seconds.isFinite {
                try VideoOps.frame(at: seconds, of: url, pixels: maxPixel, to: out)
                let (width, height) = dimensions(of: out)
                return reply(out, width, height)
            } else if let page = a.optInt("page") {
                image = try pdfPage(url, page, pixels: maxPixel, marking: a.strings("words"))
            } else if let range = a.numbers("range"), range.count == 2 {
                image = try waveform(url, lit: range[0]...max(range[0], range[1]), width: maxPixel)
            }
        } catch {
            log("thumb: \(describe(error)): showing the picture of \(url.lastPathComponent) instead")
        }
        let shown = try image ?? picture(url, maxPixel: maxPixel)
        // JPEG has no alpha: a transparent picture goes on white.
        try Pictures.write(png ? shown : Pictures.flattened(shown), to: out, png: png)
        return reply(out, shown.width, shown.height)
    }

    private static func reply(_ out: URL, _ width: Int, _ height: Int) -> JSON {
        ["path": .string(out.path), "width": .int(width), "height": .int(height)]
    }

    private static func dimensions(of url: URL) -> (Int, Int) {
        guard let source = CGImageSourceCreateWithURL(url as CFURL, nil),
              let properties = CGImageSourceCopyPropertiesAtIndex(source, 0, nil) as? [CFString: Any]
        else { return (0, 0) }
        return (properties[kCGImagePropertyPixelWidth] as? Int ?? 0, properties[kCGImagePropertyPixelHeight] as? Int ?? 0)
    }

    // MARK: Pictures

    /// The picture itself through ImageIO (never enlarged), a vector picture drawn by AppKit, anything else as Quick
    /// Look shows it.
    private static func picture(_ url: URL, maxPixel: Int) throws -> CGImage {
        if let source = CGImageSourceCreateWithURL(url as CFURL, nil), CGImageSourceGetType(source) != nil {
            let properties = CGImageSourceCopyPropertiesAtIndex(source, 0, nil) as? [CFString: Any] ?? [:]
            let longSide = max(properties[kCGImagePropertyPixelWidth] as? Int ?? 0,
                               properties[kCGImagePropertyPixelHeight] as? Int ?? 0)
            let options: [CFString: Any] = [
                kCGImageSourceCreateThumbnailFromImageAlways: true,
                kCGImageSourceThumbnailMaxPixelSize: longSide > 0 ? min(maxPixel, longSide) : maxPixel,
                kCGImageSourceCreateThumbnailWithTransform: true,
                kCGImageSourceShouldCacheImmediately: true,
            ]
            if let thumbnail = CGImageSourceCreateThumbnailAtIndex(source, 0, options as CFDictionary) { return thumbnail }
        }
        if let vector = try? Pictures.drawVector(url, maxPixel: maxPixel) { return vector.image }
        if let thumbnail = quickLook(url, side: maxPixel) { return thumbnail }
        throw ExtractError.unreadable("no picture of this file")
    }

    private final class ThumbnailBox: @unchecked Sendable {
        var image: CGImage?
    }

    /// Quick Look's picture of the file (the system caches these across apps).
    private static func quickLook(_ url: URL, side: Int) -> CGImage? {
        let request = QLThumbnailGenerator.Request(fileAt: url, size: CGSize(width: side, height: side), scale: 1,
                                                   representationTypes: .thumbnail)
        let box = ThumbnailBox()
        let done = DispatchSemaphore(value: 0)
        QLThumbnailGenerator.shared.generateBestRepresentation(for: request) { representation, _ in
            box.image = representation?.cgImage
            done.signal()
        }
        _ = done.wait(timeout: .now() + 30)
        return box.image
    }

    // MARK: PDF page

    /// Page `number` (1-based), fitted into a square of `pixels`, with `words` marked where they're on it, the way
    /// Preview marks what you searched for. With marks, it shows the band of the page around them (as wide as the page,
    /// 2:3 as high), so the words can be read in a small preview. DigUp: Previews.page(_:of:pixels:marking:).
    private static func pdfPage(_ url: URL, _ number: Int, pixels: Int, marking words: [String]) throws -> CGImage {
        guard let document = PDFDocument(url: url) else { throw ExtractError.unreadable("can't open PDF") }
        if document.isLocked { throw ExtractError.locked }
        guard let page = document.page(at: max(0, number - 1)) ?? document.page(at: 0)
        else { throw ExtractError.unreadable("no page \(number)") }
        let transform = page.transform(for: .cropBox)
        let bounds = page.bounds(for: .cropBox).applying(transform)
        let marks = places(of: words, on: page)
        var shown = CGRect(origin: .zero, size: bounds.size)
        if let first = marks.first?.applying(transform) {
            let height = min(bounds.height, bounds.width / 1.5)
            let top = min(max(0, first.midY - height * 0.55), bounds.height - height)
            shown = CGRect(x: 0, y: top, width: bounds.width, height: height)
        }
        let scale = CGFloat(pixels) / max(shown.width, shown.height, 1)
        let width = max(1, Int(shown.width * scale)), height = max(1, Int(shown.height * scale))
        guard let context = CGContext(data: nil, width: width, height: height, bitsPerComponent: 8, bytesPerRow: 0,
                                      space: CGColorSpaceCreateDeviceRGB(),
                                      bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue)
        else { throw ExtractError.unreadable("can't draw the page") }
        context.setFillColor(.white)
        context.fill(CGRect(x: 0, y: 0, width: width, height: height))
        context.scaleBy(x: scale, y: scale)
        context.translateBy(x: -shown.minX, y: -shown.minY)
        page.draw(with: .cropBox, to: context)
        if !marks.isEmpty {
            context.concatenate(transform)
            context.setBlendMode(.multiply)
            context.setFillColor(CGColor(red: 1, green: 0.85, blue: 0.1, alpha: 0.85))
            for rect in marks { context.fill(rect.insetBy(dx: -1, dy: -1)) }
        }
        guard let image = context.makeImage() else { throw ExtractError.unreadable("can't draw the page") }
        return image
    }

    /// Where `words` are on `page` (as keyword search finds them: `SearchText.matches`), in page space.
    private static func places(of words: [String], on page: PDFPage) -> [CGRect] {
        guard let text = page.string, !text.isEmpty else { return [] }
        var rects: [CGRect] = []
        for word in Set(words.filter { $0.count >= 2 }) {
            for found in SearchText.matches(of: word, in: text).prefix(200) {
                guard let selection = page.selection(for: NSRange(found, in: text)) else { continue }
                rects += selection.selectionsByLine().map { $0.bounds(for: page) }
            }
        }
        return rects
    }

    // MARK: Waveform

    private final class Meter: @unchecked Sendable {
        var peaks: [Float] = []
        var total = 0
    }

    /// The loudness of the whole file as bars on a transparent ground (it reads on light and dark), the stretch that
    /// matched in DigUp's amber (Brand.amber, #F2A22A).
    private static func waveform(_ url: URL, lit: ClosedRange<Double>, width: Int) throws -> CGImage {
        let binSize = 160   // samples: 10 ms
        let meter = Meter()
        _ = try runBlocking {
            try await Audio.stream(url) { samples in
                for sample in samples {
                    let bin = meter.total / binSize
                    if bin >= meter.peaks.count {
                        meter.peaks.append(contentsOf: repeatElement(0, count: bin - meter.peaks.count + 1))
                    }
                    let level = Float(abs(Int(sample))) / 32768
                    if level > meter.peaks[bin] { meter.peaks[bin] = level }
                    meter.total += 1
                }
            }
        }
        let (peaks, total) = (meter.peaks, meter.total)
        guard total > 0 else { throw ExtractError.unreadable("no sound to draw") }
        let height = max(48, width * 3 / 8)
        let pitch = 4, barWidth = 3
        let columns = max(1, width / pitch)
        let duration = Double(total) / Audio.sampleRate
        let loudest = max(peaks.max() ?? 0, 0.0001)
        guard let context = CGContext(data: nil, width: width, height: height, bitsPerComponent: 8, bytesPerRow: 0,
                                      space: Pictures.sRGB, bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue)
        else { throw ExtractError.unreadable("can't draw the waveform") }
        let ground = CGColor(red: 0.5, green: 0.5, blue: 0.5, alpha: 0.55)
        let amber = CGColor(red: 0.949, green: 0.635, blue: 0.165, alpha: 1)
        for column in 0..<columns {
            let from = column * peaks.count / columns
            let to = max(from + 1, (column + 1) * peaks.count / columns)
            let peak = peaks[from..<min(to, peaks.count)].max() ?? 0
            // The square root lifts quiet speech next to loud peaks.
            let barHeight = max(3, CGFloat((peak / loudest).squareRoot()) * CGFloat(height) * 0.9)
            let start = Double(column) / Double(columns) * duration, end = Double(column + 1) / Double(columns) * duration
            context.setFillColor(start <= lit.upperBound && end >= lit.lowerBound ? amber : ground)
            let rect = CGRect(x: CGFloat(column * pitch), y: (CGFloat(height) - barHeight) / 2, width: CGFloat(barWidth),
                              height: barHeight)
            context.addPath(CGPath(roundedRect: rect, cornerWidth: 1.5, cornerHeight: 1.5, transform: nil))
            context.fillPath()
        }
        guard let image = context.makeImage() else { throw ExtractError.unreadable("can't draw the waveform") }
        return image
    }
}
