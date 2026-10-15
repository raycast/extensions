// The numbers the folder estimate needs without reading a file through: a PDF's page count and a recording's length.
// DigUp: Files+Apple.swift (Estimator.pages, Estimator.duration), Media+Apple.swift (MediaInfo.duration).
import AVFoundation
import CoreGraphics
import CoreServices
import Foundation

enum Estimate {
    /// `pages`: per path, Spotlight's page count, else CGPDFDocument's, else 1.
    static func pages(_ a: Args) throws -> JSON {
        let counts = a.strings("paths").map { path in autoreleasepool { pages(of: path) } }
        return ["pages": .array(counts.map { .int($0) })]
    }

    /// `duration`: per path, Spotlight's duration, else AVFoundation's, else ffprobe's (formats AVFoundation can't
    /// open are read with ffmpeg here, DigUp has no such fallback on a Mac), else 0. Pass only files that are on the Mac:
    /// AVFoundation downloads an iCloud placeholder to read it.
    static func duration(_ a: Args) throws -> JSON {
        let seconds = a.strings("paths").map { path in autoreleasepool { duration(of: path) } }
        return ["seconds": .array(seconds.map { .double($0) })]
    }

    static func pages(of path: String) -> Int {
        if let pages = spotlight(path, kMDItemNumberOfPages), pages > 0 { return Int(pages) }
        return CGPDFDocument(URL(fileURLWithPath: path) as CFURL)?.numberOfPages ?? 1
    }

    static func duration(of path: String) -> Double {
        if let seconds = spotlight(path, kMDItemDurationSeconds), seconds > 0 { return seconds }
        let url = URL(fileURLWithPath: path)
        let seconds = try? runBlocking { try await AVURLAsset(url: url).load(.duration).seconds }
        if let seconds, seconds.isFinite, seconds > 0 { return seconds }
        guard FFmpeg.ffprobe != nil, let probed = try? FFmpeg.duration(of: url) else { return 0 }
        return probed
    }

    private static func spotlight(_ path: String, _ attribute: CFString) -> Double? {
        guard let item = MDItemCreate(kCFAllocatorDefault, path as CFString) else { return nil }
        return (MDItemCopyAttribute(item, attribute) as? NSNumber)?.doubleValue
    }
}
