import Foundation

/// Pictures for a shell's previews and thumbnails (`digup search-service`'s render op): a PDF's page, a video's frame at
/// a moment, or a picture a web view can't show (HEIC off macOS, RAW), as JPEG.
public enum PreviewImages {
    public enum Kind: String, Sendable {
        case pdf, video, image
    }

    /// Writes the picture into `folder` and returns its path. `loc` is the page (from 1) or the second.
    public static func make(_ kind: Kind, of path: String, at loc: Double?, pixels: Int, in folder: URL) throws
        -> String {
        let url = URL(fileURLWithPath: path)
        let out = folder.appendingPathComponent(UUID().uuidString + ".jpg")
        switch kind {
        case .pdf:
            try PDFExtractor.renderPage(Int(loc ?? 1), of: url, pixels: pixels, to: out)
        case .video:
            let seconds = loc ?? 0
            try runBlocking { try await VideoExtractor.frame(at: seconds, of: url, pixels: pixels, to: out) }
        case .image:
            return try ImageExtractor.prepare(url, maxPixel: pixels, minSide: 0, to: folder, png: false).path
        }
        return out.path
    }
}
