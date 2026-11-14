// Vector math without Accelerate (Linux, Windows): plain loops over SIMD8 lanes. 70,000 vectors score in a few
// milliseconds either way; `Float16` is a hardware type on x86-64 and arm64 here (it's only missing on Intel Macs).
#if !canImport(Accelerate)
extension Vectors {
    /// Converts `count` float16s into float32s.
    static func floats(fromHalf source: UnsafePointer<Float16>, count: Int, to destination: UnsafeMutablePointer<Float>) {
        for index in 0..<count { destination[index] = Float(source[index]) }
    }

    /// `scores[i]` = the dot product of row `i` of `rows` (`count` rows of `dimension` floats) with `query`.
    static func scores(of rows: UnsafePointer<Float>, count: Int, query: UnsafePointer<Float>,
                       into scores: UnsafeMutablePointer<Float>) {
        let lanes = dimension / 8   // 768 = 96 × 8
        let queryLanes = (0..<lanes).map {
            UnsafeRawPointer(query).loadUnaligned(fromByteOffset: $0 * 32, as: SIMD8<Float>.self)
        }
        for row in 0..<count {
            let start = UnsafeRawPointer(rows + row * dimension)
            var sum = SIMD8<Float>.zero
            for lane in 0..<lanes {
                sum += queryLanes[lane] * start.loadUnaligned(fromByteOffset: lane * 32, as: SIMD8<Float>.self)
            }
            scores[row] = sum.sum()
        }
    }
}
#endif
