// Pictures without ImageIO (Linux, Windows): stb_image decodes, stb_image_resize2 scales, stb_image_write encodes
// (Vendor/stb, scripts/fetch-vendor.sh); what stb can't read goes through ffmpeg.
#if !canImport(ImageIO)
import CStb
import Foundation

extension ImageExtractor {
    /// No SVG here yet: stb and ffmpeg don't draw vector pictures.
    static let drawsVectorPictures = false

    /// Writes a downscaled copy for the model: decoded in full, turned the way the camera held it, scaled so the long
    /// side is `maxPixel`. stb reads JPEG, PNG, BMP, GIF, PSD, TGA and PNM here; HEIC, WebP, TIFF and AVIF go through
    /// ffmpeg (`decodeWithFFmpeg`). RAW isn't read yet, and says so.
    static func prepare(_ url: URL, maxPixel: Int, minSide: Int, to folder: URL, png: Bool) throws -> Prepared {
        let exif = EXIF.read(url)
        var image: RGBImage
        let width: Int, height: Int
        var storedWidth: Int32 = 0, storedHeight: Int32 = 0, channels: Int32 = 0
        if stbi_info(url.path, &storedWidth, &storedHeight, &channels) != 0 {
            (width, height) = (Int(storedWidth), Int(storedHeight))
            guard max(width, height) >= minSide else { throw ExtractError.tooSmall(width, height) }
            guard let decoded = RGBImage.load(url.path) else { throw ExtractError.unreadable("can't decode image") }
            image = decoded.oriented(exif?.orientation ?? 1)
        } else {
            if let note = notReadYet(url.pathExtension.lowercased()) { throw ExtractError.unreadable(note) }
            if exif?.tiled == true {
                throw ExtractError.unreadable("tiled TIFF pictures aren't read on this system yet")
            }
            image = try decodeWithFFmpeg(url)
            // Its size as shown (ImageIO reports it as stored: the two differ for a picture turned 90°).
            (width, height) = (image.width, image.height)
            guard max(width, height) >= minSide else { throw ExtractError.tooSmall(width, height) }
        }
        let longest = max(image.width, image.height)
        if longest > maxPixel {
            let scale = Double(maxPixel) / Double(longest)
            image = try image.resized(width: max(1, Int((Double(image.width) * scale).rounded())),
                                      height: max(1, Int((Double(image.height) * scale).rounded())))
        }
        let out = folder.appendingPathComponent(UUID().uuidString + (png ? ".png" : ".jpg"))
        try image.write(to: out, png: png)
        return Prepared(path: out.path, width: width, height: height, taken: exif?.dateTimeOriginal)
    }

    /// The whole picture, through ffmpeg as 8-bit RGB (PPM down a pipe), turned the way the file says (irot/imir in
    /// HEIF, the EXIF orientation elsewhere) and, for a tiled HEIC, stitched whole. ffmpeg 8.1 and later do both
    /// (2026-10-11; 6.1 reads no HEIC and leaves WebP and TIFF unturned), so builds bring their own. A
    /// TIFF stored in tiles (ImageIO writes uncompressed ones that way) comes out black, so `prepare` doesn't ask.
    static func decodeWithFFmpeg(_ url: URL) throws -> RGBImage {
        guard FFmpeg.ffmpeg != nil else {
            throw ExtractError.unreadable("ffmpeg isn't installed (HEIC, WebP and TIFF pictures need it)")
        }
        var data = Data()
        do {
            try FFmpeg.run(FFmpeg.ffmpeg, ["-v", "error", "-nostdin", "-i", url.path, "-frames:v", "1", "-pix_fmt",
                                           "rgb24", "-f", "image2pipe", "-c:v", "ppm", "-"]) { data.append($0) }
        } catch {
            let ext = url.pathExtension.lowercased()
            if ext == "heic" || ext == "heif" { throw ExtractError.unreadable("this ffmpeg can't read HEIC (8.1 can)") }
            throw ExtractError.unreadable("can't decode image")
        }
        guard let image = RGBImage.load(data) else { throw ExtractError.unreadable("can't decode image") }
        return image
    }

    /// Why a picture of a kind neither stb nor ffmpeg decodes isn't readable, for the file's note.
    static func notReadYet(_ ext: String) -> String? {
        let raw: Set<String> = ["cr2", "nef", "arw", "dng", "raf", "orf", "rw2"]
        return raw.contains(ext) ? "RAW pictures (\(ext.uppercased())) aren't read on this system yet" : nil
    }
}

extension OCR {
    static let isAvailable = false

    /// No text recognition here yet: screenshots have their picture vector and their name.
    static func text(ofImageAt url: URL) -> String { "" }
}

/// Packed 8-bit RGB in memory: what stb decodes to and encodes from.
struct RGBImage {
    var width: Int
    var height: Int
    var pixels: [UInt8]

    /// Decoded from a file (nil when stb can't read it).
    static func load(_ path: String) -> RGBImage? {
        var width: Int32 = 0, height: Int32 = 0, channels: Int32 = 0
        guard let pixels = stbi_load(path, &width, &height, &channels, 3) else { return nil }
        defer { stbi_image_free(pixels) }
        return RGBImage(width: Int(width), height: Int(height),
                        pixels: Array(UnsafeBufferPointer(start: pixels, count: Int(width) * Int(height) * 3)))
    }

    /// Decoded from a file's bytes in memory (nil when stb can't read them).
    static func load(_ data: Data) -> RGBImage? {
        guard !data.isEmpty, data.count <= Int(Int32.max) else { return nil }
        var width: Int32 = 0, height: Int32 = 0, channels: Int32 = 0
        let pixels = data.withUnsafeBytes { bytes in
            stbi_load_from_memory(bytes.bindMemory(to: UInt8.self).baseAddress, Int32(bytes.count), &width, &height,
                                  &channels, 3)
        }
        guard let pixels else { return nil }
        defer { stbi_image_free(pixels) }
        return RGBImage(width: Int(width), height: Int(height),
                        pixels: Array(UnsafeBufferPointer(start: pixels, count: Int(width) * Int(height) * 3)))
    }

    /// Turned the way the camera held it (EXIF orientation 1–8), as ImageIO's thumbnails are.
    func oriented(_ orientation: Int) -> RGBImage {
        guard (2...8).contains(orientation) else { return self }
        let swaps = orientation >= 5
        let (w, h) = swaps ? (height, width) : (width, height)
        var out = [UInt8](repeating: 0, count: pixels.count)
        for y in 0..<h {
            for x in 0..<w {
                let sx: Int, sy: Int   // the source pixel that lands at (x, y)
                switch orientation {
                case 2: (sx, sy) = (width - 1 - x, y)                  // mirrored
                case 3: (sx, sy) = (width - 1 - x, height - 1 - y)     // upside down
                case 4: (sx, sy) = (x, height - 1 - y)                 // flipped
                case 5: (sx, sy) = (y, x)                              // transposed
                case 6: (sx, sy) = (y, height - 1 - x)                 // 90° clockwise
                case 7: (sx, sy) = (width - 1 - y, height - 1 - x)     // transverse
                default: (sx, sy) = (width - 1 - y, x)                 // 8: 90° counterclockwise
                }
                let s = (sy * width + sx) * 3, d = (y * w + x) * 3
                out[d] = pixels[s]
                out[d + 1] = pixels[s + 1]
                out[d + 2] = pixels[s + 2]
            }
        }
        return RGBImage(width: w, height: h, pixels: out)
    }

    func resized(width newWidth: Int, height newHeight: Int) throws -> RGBImage {
        var out = [UInt8](repeating: 0, count: newWidth * newHeight * 3)
        let done = out.withUnsafeMutableBufferPointer { out in
            stbir_resize_uint8_srgb(pixels, Int32(width), Int32(height), 0, out.baseAddress, Int32(newWidth),
                                    Int32(newHeight), 0, STBIR_RGB) != nil
        }
        guard done else { throw ExtractError.unreadable("can't resize image") }
        return RGBImage(width: newWidth, height: newHeight, pixels: out)
    }

    func write(to url: URL, png: Bool) throws {
        let written = png ? stbi_write_png(url.path, Int32(width), Int32(height), 3, pixels, Int32(width * 3))
                          : stbi_write_jpg(url.path, Int32(width), Int32(height), 3, pixels, 90)
        guard written != 0 else { throw ExtractError.unreadable("can't write \(url.lastPathComponent)") }
    }

    /// 8×8 average hash, as `VideoExtractor.averageHash` on macOS: gray cells brighter than the mean are 1.
    func averageHash() -> UInt64 {
        let side = 8
        var cells = [Int](repeating: 0, count: side * side)
        for cy in 0..<side {
            let y0 = cy * height / side, y1 = min(height, max(y0 + 1, (cy + 1) * height / side))
            for cx in 0..<side {
                let x0 = cx * width / side, x1 = min(width, max(x0 + 1, (cx + 1) * width / side))
                var sum = 0, n = 0
                for y in y0..<y1 {
                    for x in x0..<x1 {
                        let p = (y * width + x) * 3
                        sum += (Int(pixels[p]) * 299 + Int(pixels[p + 1]) * 587 + Int(pixels[p + 2]) * 114) / 1000
                        n += 1
                    }
                }
                cells[cy * side + cx] = n > 0 ? sum / n : 0
            }
        }
        let mean = cells.reduce(0, +) / cells.count
        var hash: UInt64 = 0
        for (index, cell) in cells.enumerated() where cell > mean { hash |= 1 << UInt64(index) }
        return hash
    }
}
#endif
