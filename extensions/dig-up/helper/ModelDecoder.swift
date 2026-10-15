// llama.cpp's own image decoder: stb_image, which libmtmd exports. DigUp hands the model a JPEG scratch copy that
// stb_image decodes; ImageIO decodes the same JPEG a little differently, enough to move about one photo in ten below
// DigUp's 0.999 vector agreement. Loading stb from the llama.cpp build the embedder runs gives the same pixels.
import Darwin
import Foundation

enum ModelDecoder {
    /// libmtmd.dylib of the llama.cpp build the embedder runs (`serve --mtmd`). Without it, ImageIO decodes.
    static var library: String?

    private typealias Load = @convention(c) (UnsafePointer<UInt8>?, Int32, UnsafeMutablePointer<Int32>?,
                                             UnsafeMutablePointer<Int32>?, UnsafeMutablePointer<Int32>?, Int32)
        -> UnsafeMutablePointer<UInt8>?
    private typealias Free = @convention(c) (UnsafeMutableRawPointer?) -> Void

    /// Loaded on first use, so a helper that only walks never maps llama.cpp.
    private static let stb: (load: Load, free: Free)? = {
        let fallback = "ImageIO decodes JPEG instead (vectors can differ a little from DigUp's)"
        guard let library else {
            log("no libmtmd given: \(fallback)")
            return nil
        }
        guard let handle = dlopen(library, RTLD_NOW | RTLD_LOCAL) else {
            log("can't load \(library) (\(dlerror().map { String(cString: $0) } ?? "unknown error")): \(fallback)")
            return nil
        }
        guard let load = dlsym(handle, "stbi_load_from_memory"), let free = dlsym(handle, "stbi_image_free") else {
            log("\(library) has no stb_image: \(fallback)")
            return nil
        }
        return (unsafeBitCast(load, to: Load.self), unsafeBitCast(free, to: Free.self))
    }()

    static var loaded: Bool { stb != nil }

    /// Packed RGB as mtmd reads a picture file (`stbi_load_from_memory`, 3 channels). Nil without stb, or when stb
    /// can't read the data.
    static func decode(_ data: Data) -> RGBImage? {
        guard let stb, data.count < Int32.max else { return nil }
        var width: Int32 = 0, height: Int32 = 0, channels: Int32 = 0
        let pixels = data.withUnsafeBytes { buffer in
            stb.load(buffer.bindMemory(to: UInt8.self).baseAddress, Int32(buffer.count), &width, &height, &channels, 3)
        }
        guard let pixels else { return nil }
        defer { stb.free(pixels) }
        let count = Int(width) * Int(height) * 3
        return RGBImage(width: Int(width), height: Int(height), bytes: Array(UnsafeBufferPointer(start: pixels, count: count)))
    }
}
