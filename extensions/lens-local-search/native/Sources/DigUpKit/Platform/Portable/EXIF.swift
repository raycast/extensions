// The two EXIF facts the indexer wants where ImageIO isn't there (Linux, Windows): the way the camera held the picture
// (orientation) and when it took it (DateTimeOriginal, as written). Found in a JPEG's APP1 segment, a TIFF's own tags,
// a WebP's EXIF chunk or a HEIF/AVIF file's Exif item; each holds a TIFF header → IFD0 → Exif IFD.
#if !canImport(ImageIO)
import Foundation

struct EXIF {
    var orientation = 1
    var dateTimeOriginal: String?
    /// The file is a TIFF that keeps its pixels in tiles (TileWidth in IFD0), which ffmpeg decodes as black.
    var tiled = false

    /// Reads the file's headers, not the file. Nil when it has no EXIF block this reader knows.
    static func read(_ url: URL) -> EXIF? {
        guard let file = FileBytes(url), let start = file.bytes(0, 12) else { return nil }
        if start[0] == 0xFF, start[1] == 0xD8 { return jpeg(file) }
        let tiffHeaders: [[UInt8]] = [[0x49, 0x49, 0x2A, 0x00], [0x4D, 0x4D, 0x00, 0x2A]]
        if tiffHeaders.contains(where: { start[0..<4].elementsEqual($0) }) {
            return parse(file, tiff: 0, end: file.size)
        }
        if start[0..<4].elementsEqual("RIFF".utf8), start[8..<12].elementsEqual("WEBP".utf8) { return webp(file) }
        if start[4..<8].elementsEqual("ftyp".utf8) { return heif(file) }
        return nil
    }

    /// The APP1 segment that starts with "Exif\0\0", among the headers before the image data.
    private static func jpeg(_ file: FileBytes) -> EXIF? {
        var i = 2
        while i < 1 << 20, file.byte(i) == 0xFF, let marker = file.byte(i + 1) {
            if marker == 0xD8 || marker == 0x01 || (0xD0...0xD7).contains(marker) {   // markers without a length
                i += 2
                continue
            }
            if marker == 0xDA || marker == 0xD9 { break }   // the image data: no more headers
            guard let length = file.u16(i + 2, little: false), length >= 2 else { return nil }
            if marker == 0xE1, file.bytes(i + 4, 6)?.elementsEqual("Exif\0\0".utf8) == true {
                return parse(file, tiff: i + 10, end: min(file.size, i + 2 + length))
            }
            i += 2 + length
        }
        return nil
    }

    /// The RIFF chunk "EXIF" (after the image data, as WebP files order them); some writers start it with "Exif\0\0".
    private static func webp(_ file: FileBytes) -> EXIF? {
        var i = 12
        while let name = file.bytes(i, 4), let size = file.u32(i + 4, little: true) {
            if name.elementsEqual("EXIF".utf8) {
                let start = file.bytes(i + 8, 6)?.elementsEqual("Exif\0\0".utf8) == true ? i + 14 : i + 8
                return parse(file, tiff: start, end: min(file.size, i + 8 + size))
            }
            i += 8 + size + (size & 1)
        }
        return nil
    }

    /// HEIF and AVIF: the meta box lists the file's items (iinf) and where their bytes are (iloc). The Exif item's
    /// bytes start with the offset of the TIFF header after them (ISO/IEC 23008-12, annex A).
    private static func heif(_ file: FileBytes) -> EXIF? {
        guard let meta = box("meta", in: 0..<file.size, file) else { return nil }
        let children = (meta.lowerBound + 4)..<meta.upperBound   // meta is a full box: version and flags first
        guard let iinf = box("iinf", in: children, file), let iloc = box("iloc", in: children, file),
              let exifItem = item(ofType: "Exif", in: iinf, file),
              let bytes = extent(ofItem: exifItem, in: iloc, file), let skip = file.u32(bytes.start, little: false)
        else { return nil }
        return parse(file, tiff: bytes.start + 4 + skip, end: min(file.size, bytes.start + bytes.length))
    }

    /// The body (after size and type) of the first box named `type` among the boxes filling `range`.
    private static func box(_ type: String, in range: Range<Int>, _ file: FileBytes) -> Range<Int>? {
        var i = range.lowerBound
        while i + 8 <= range.upperBound, let declared = file.u32(i, little: false), let name = file.bytes(i + 4, 4) {
            var header = 8, size = declared
            if declared == 1 {   // a 64-bit size follows
                guard let large = file.uint(i + 8, 8) else { return nil }
                (header, size) = (16, large)
            } else if declared == 0 {   // to the end
                size = range.upperBound - i
            }
            guard size >= header, i + size <= range.upperBound else { return nil }
            if name.elementsEqual(type.utf8) { return (i + header)..<(i + size) }
            i += size
        }
        return nil
    }

    /// The id of the first item of `type` in an iinf box (its infe entries, version 2 or 3).
    private static func item(ofType type: String, in iinf: Range<Int>, _ file: FileBytes) -> Int? {
        guard let version = file.byte(iinf.lowerBound) else { return nil }
        var i = iinf.lowerBound + 4 + (version == 0 ? 2 : 4)
        while i + 8 <= iinf.upperBound, let size = file.u32(i, little: false), size >= 8 {
            let body = i + 8
            if file.bytes(i + 4, 4)?.elementsEqual("infe".utf8) == true, let infeVersion = file.byte(body),
               infeVersion >= 2 {
                let idSize = infeVersion == 2 ? 2 : 4
                if file.bytes(body + 4 + idSize + 2, 4)?.elementsEqual(type.utf8) == true {
                    return file.uint(body + 4, idSize)
                }
            }
            i += size
        }
        return nil
    }

    /// Where an item's bytes start in the file, and how many there are (its first extent), from an iloc box. Nil for
    /// bytes kept anywhere but the file itself.
    private static func extent(ofItem wanted: Int, in iloc: Range<Int>, _ file: FileBytes)
        -> (start: Int, length: Int)? {
        guard let version = file.byte(iloc.lowerBound), let sizes = file.byte(iloc.lowerBound + 4),
              let more = file.byte(iloc.lowerBound + 5) else { return nil }
        let offsetSize = Int(sizes >> 4), lengthSize = Int(sizes & 15), baseSize = Int(more >> 4)
        let indexSize = version == 1 || version == 2 ? Int(more & 15) : 0
        var i = iloc.lowerBound + 6
        guard let count = file.uint(i, version < 2 ? 2 : 4) else { return nil }
        i += version < 2 ? 2 : 4
        for _ in 0..<min(count, 100_000) {
            guard let id = file.uint(i, version < 2 ? 2 : 4) else { return nil }
            i += version < 2 ? 2 : 4
            var method = 0
            if version == 1 || version == 2 {
                guard let value = file.uint(i, 2) else { return nil }
                method = value & 15
                i += 2
            }
            i += 2   // data_reference_index
            guard let base = file.uint(i, baseSize), let extents = file.uint(i + baseSize, 2) else { return nil }
            i += baseSize + 2
            var first: (start: Int, length: Int)?
            for _ in 0..<extents {
                i += indexSize
                guard let offset = file.uint(i, offsetSize), let length = file.uint(i + offsetSize, lengthSize)
                else { return nil }
                i += offsetSize + lengthSize
                if first == nil { first = (base + offset, length) }
            }
            if id == wanted { return method == 0 ? first : nil }
            guard i < iloc.upperBound else { return nil }
        }
        return nil
    }

    /// A TIFF header at `tiff` and the IFDs it points to, within `end`.
    private static func parse(_ file: FileBytes, tiff: Int, end: Int) -> EXIF? {
        guard tiff + 8 <= end, let order = file.bytes(tiff, 2) else { return nil }
        let little: Bool
        if order == [0x49, 0x49] { little = true }
        else if order == [0x4D, 0x4D] { little = false }
        else { return nil }
        func u16(_ at: Int) -> Int? { at >= tiff && at + 2 <= end ? file.u16(at, little: little) : nil }
        func u32(_ at: Int) -> Int? { at >= tiff && at + 4 <= end ? file.u32(at, little: little) : nil }
        /// Calls `visit(tag, type, count, valueAt)` for each entry of the IFD at `at`.
        func scan(_ at: Int, _ visit: (Int, Int, Int, Int) -> Void) {
            guard let count = u16(at) else { return }
            for n in 0..<min(count, 500) {
                let entry = at + 2 + n * 12
                guard let tag = u16(entry), let type = u16(entry + 2), let number = u32(entry + 4) else { return }
                visit(tag, type, number, entry + 8)
            }
        }
        var exif = EXIF()
        var exifIFD: Int?
        guard let ifd0 = u32(tiff + 4) else { return nil }
        scan(tiff + ifd0) { tag, type, _, at in
            if tag == 0x0112, type == 3, let value = u16(at) { exif.orientation = value }
            if tag == 0x8769, type == 4, let offset = u32(at) { exifIFD = tiff + offset }
            if tag == 0x0142, tiff == 0 { exif.tiled = true }
        }
        if let exifIFD {
            scan(exifIFD) { tag, type, count, at in
                guard tag == 0x9003, type == 2, count >= 19, let offset = u32(at), tiff + offset + 19 <= end,
                      let text = file.bytes(tiff + offset, 19) else { return }
                exif.dateTimeOriginal = String(decoding: text, as: UTF8.self)
            }
        }
        return exif
    }
}

/// A file read where asked, 64 KB at a time: a TIFF's tags often sit after its pixels, and the file can be big.
private final class FileBytes {
    static let blockSize = 1 << 16
    let size: Int
    private let handle: FileHandle
    private var blocks: [Int: [UInt8]] = [:]

    init?(_ url: URL) {
        guard let handle = try? FileHandle(forReadingFrom: url), let end = try? handle.seekToEnd() else { return nil }
        self.handle = handle
        size = Int(end)
    }

    deinit { try? handle.close() }

    func byte(_ at: Int) -> UInt8? {
        guard at >= 0, at < size else { return nil }
        let index = at / Self.blockSize
        if blocks[index] == nil {
            guard blocks.count < 32 else { return nil }   // 2 MB of headers: not a picture this reader knows
            try? handle.seek(toOffset: UInt64(index * Self.blockSize))
            blocks[index] = (try? handle.read(upToCount: Self.blockSize)).map { [UInt8]($0) } ?? []
        }
        let block = blocks[index]!, offset = at - index * Self.blockSize
        return offset < block.count ? block[offset] : nil
    }

    func bytes(_ at: Int, _ count: Int) -> [UInt8]? {
        guard count >= 0 else { return nil }
        var out: [UInt8] = []
        out.reserveCapacity(count)
        for i in at..<(at + count) {
            guard let value = byte(i) else { return nil }
            out.append(value)
        }
        return out
    }

    /// An unsigned big-endian number of `width` bytes (0, 1, 2, 4 or 8; 0 reads as 0, as iloc means it).
    func uint(_ at: Int, _ width: Int) -> Int? {
        guard width > 0 else { return 0 }
        guard width <= 8, let raw = bytes(at, width) else { return nil }
        let value = raw.reduce(UInt64(0)) { $0 << 8 | UInt64($1) }
        return value <= UInt64(Int.max) ? Int(value) : nil
    }

    func u16(_ at: Int, little: Bool) -> Int? {
        guard let b = bytes(at, 2) else { return nil }
        return little ? Int(b[0]) | Int(b[1]) << 8 : Int(b[0]) << 8 | Int(b[1])
    }

    func u32(_ at: Int, little: Bool) -> Int? {
        guard let b = bytes(at, 4) else { return nil }
        return little ? Int(b[0]) | Int(b[1]) << 8 | Int(b[2]) << 16 | Int(b[3]) << 24
                      : Int(b[0]) << 24 | Int(b[1]) << 16 | Int(b[2]) << 8 | Int(b[3])
    }
}
#endif
