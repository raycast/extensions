// Reading a file for C libraries through Foundation rather than by path (Linux, Windows): miniz and PDFium open paths
// with fopen and CreateFileA, which on Windows read the ANSI code page, so a Bengali or Arabic file name wouldn't open.
// They read through `read(at:into:count:)` instead, a block at a time.
#if !canImport(PDFKit)
import Foundation

final class FileReader {
    let size: UInt64
    private let handle: FileHandle

    init(_ url: URL) throws {
        handle = try FileHandle(forReadingFrom: url)
        size = try handle.seekToEnd()
    }

    deinit { try? handle.close() }

    /// Copies up to `count` bytes from `offset` into `buffer`; how many it copied.
    func read(at offset: UInt64, into buffer: UnsafeMutableRawPointer, count: Int) -> Int {
        guard count > 0, (try? handle.seek(toOffset: offset)) != nil,
              let data = try? handle.read(upToCount: count) else { return 0 }
        data.copyBytes(to: buffer.assumingMemoryBound(to: UInt8.self), count: data.count)
        return data.count
    }

    /// Itself as a C callback's context (it must outlive the C library's use of it).
    var opaque: UnsafeMutableRawPointer { Unmanaged.passUnretained(self).toOpaque() }

    static func from(_ opaque: UnsafeMutableRawPointer?) -> FileReader {
        Unmanaged<FileReader>.fromOpaque(opaque!).takeUnretainedValue()
    }
}
#endif
