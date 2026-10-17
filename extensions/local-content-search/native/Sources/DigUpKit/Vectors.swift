import Accelerate
import Foundation

/// Vectors are stored as 768 × float16 (1.5 KB each), kept that way in memory too, and scored as float32.
enum Vectors {
    static let dimension = 768

    static func half(_ vector: [Float]) -> Data {
        let halves = vector.map { Float16($0) }
        return halves.withUnsafeBufferPointer { Data(buffer: $0) }
    }

    /// Converts `count` float16s into float32s.
    static func floats(fromHalf source: UnsafePointer<Float16>, count: Int, to destination: UnsafeMutablePointer<Float>) {
        var from = vImage_Buffer(data: UnsafeMutableRawPointer(mutating: source), height: 1,
                                 width: vImagePixelCount(count), rowBytes: count * 2)
        var to = vImage_Buffer(data: destination, height: 1, width: vImagePixelCount(count), rowBytes: count * 4)
        vImageConvert_Planar16FtoPlanarF(&from, &to, vImage_Flags(kvImageNoFlags))
    }
}

/// The vectors search scores, as stored (float16), plus room to turn `blockRows` of them into float32 at a time.
/// Half the memory of keeping float32 (70,000 vectors: 108 MB instead of 215) for ~2 ms more a query (2026-10-09).
///
/// It's mmap'd so that releasing it really frees it. Malloc keeps freed large blocks in its cache: a freed 60 MB matrix
/// (20k vectors) stayed in the app's footprint even after `malloc_zone_pressure_relief` (measured 2026-10-07), while
/// `munmap` returns it at once.
final class VectorStorage {
    static let blockRows = 1024
    let rows: Int
    let halves: UnsafeMutablePointer<Float16>   // rows × dimension
    let block: UnsafeMutablePointer<Float>      // blockRows × dimension
    private let raw: UnsafeMutableRawPointer
    private let bytes: Int

    init?(rows: Int) {
        guard rows > 0 else { return nil }
        let halfBytes = rows * Vectors.dimension * MemoryLayout<Float16>.stride
        let blockBytes = Self.blockRows * Vectors.dimension * MemoryLayout<Float>.stride
        bytes = halfBytes + blockBytes
        guard let raw = mmap(nil, bytes, PROT_READ | PROT_WRITE, MAP_PRIVATE | MAP_ANON, -1, 0), raw != MAP_FAILED
        else { return nil }
        self.raw = raw
        self.rows = rows
        halves = raw.bindMemory(to: Float16.self, capacity: rows * Vectors.dimension)
        block = (raw + halfBytes).bindMemory(to: Float.self, capacity: Self.blockRows * Vectors.dimension)
    }

    deinit {
        munmap(raw, bytes)
    }
}
