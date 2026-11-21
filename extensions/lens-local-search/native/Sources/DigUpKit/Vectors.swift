import Foundation
#if os(Windows)
import WinSDK
#endif

/// Vectors are stored as 768 × float16 (1.5 KB each), kept that way in memory too, and scored as float32.
enum Vectors {
    static let dimension = 768

    static func half(_ vector: [Float]) -> Data {
        let halves = vector.map { Float16($0) }
        return halves.withUnsafeBufferPointer { Data(buffer: $0) }
    }
}

/// The vectors search scores, as stored (float16), plus room to turn `blockRows` of them into float32 at a time.
/// Half the memory of keeping float32 (70,000 vectors: 108 MB instead of 215) for ~2 ms more a query (2026-10-09).
///
/// It's mmap'd so that releasing it really frees it. Malloc keeps freed large blocks in its cache: a freed 60 MB matrix
/// (20k vectors) stayed in the app's footprint even after `malloc_zone_pressure_relief` (measured 2026-10-07), while
/// `munmap` returns it at once. (VirtualAlloc and VirtualFree on Windows.)
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
        #if os(Windows)
        guard let raw = VirtualAlloc(nil, SIZE_T(bytes), DWORD(MEM_COMMIT | MEM_RESERVE), DWORD(PAGE_READWRITE))
        else { return nil }
        #else
        guard let raw = mmap(nil, bytes, PROT_READ | PROT_WRITE, MAP_PRIVATE | MAP_ANON, -1, 0), raw != MAP_FAILED
        else { return nil }
        #endif
        self.raw = raw
        self.rows = rows
        halves = raw.bindMemory(to: Float16.self, capacity: rows * Vectors.dimension)
        block = (raw + halfBytes).bindMemory(to: Float.self, capacity: Self.blockRows * Vectors.dimension)
    }

    deinit {
        #if os(Windows)
        VirtualFree(raw, 0, DWORD(MEM_RELEASE))
        #else
        munmap(raw, bytes)
        #endif
    }
}
