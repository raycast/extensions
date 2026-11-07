/// How the reference sizes an image for the vision encoder, so llama.cpp sees the same pixels.
///
/// mtmd (llama.cpp's multimodal library) fixes the token budget per context, and each context loads the encoder
/// weights; it also rescales only images outside its range, while the reference always fills the budget. So images are
/// resized here, and mtmd takes them as they are. Checked against Pillow bit for bit.
enum ImageSizing {
    /// transformers' Gemma 4 image processor: scale to fill `budget` soft tokens (each 3 × 3 patches of 16 px) keeping
    /// the aspect ratio, each side rounded down to a multiple of 48 px.
    static func targetSize(height: Int, width: Int, budget: Int) -> (height: Int, width: Int)? {
        let patch = 16, pooling = 3
        let maxPatches = budget * pooling * pooling
        let factor = (Double(maxPatches * patch * patch) / Double(height * width)).squareRoot()
        let side = pooling * patch
        var targetHeight = Int((factor * Double(height) / Double(side)).rounded(.down)) * side
        var targetWidth = Int((factor * Double(width) / Double(side)).rounded(.down)) * side
        if targetHeight == 0 && targetWidth == 0 { return nil }
        let maxSide = (maxPatches / (pooling * pooling)) * side
        if targetHeight == 0 {
            targetHeight = side
            targetWidth = min(width / height * side, maxSide)
        } else if targetWidth == 0 {
            targetWidth = side
            targetHeight = min(height / width * side, maxSide)
        }
        return (targetHeight, targetWidth)
    }

    /// Pillow's bicubic resampling of packed RGB (a = −0.5, the kernel widened when shrinking, 22-bit fixed point):
    /// what the reference gets from PIL's Image.resize. Ported from mtmd's copy of it.
    static func resizeBicubic(_ source: UnsafePointer<UInt8>, width: Int, height: Int, toWidth: Int, toHeight: Int)
        -> [UInt8] {
        switch (toWidth != width, toHeight != height) {
        case (true, true):
            let pass = horizontal(source, width, height, toWidth)
            return pass.withUnsafeBufferPointer { vertical($0.baseAddress!, height, toWidth, toHeight) }
        case (true, false): return horizontal(source, width, height, toWidth)
        case (false, true): return vertical(source, height, width, toHeight)
        case (false, false): return Array(UnsafeBufferPointer(start: source, count: width * height * 3))
        }
    }

    private static let precision: Int32 = 22

    private static func filter(_ value: Double) -> Double {
        let x = abs(value), a = -0.5
        if x < 1 { return ((a + 2) * x - (a + 3)) * x * x + 1 }
        if x < 2 { return (((x - 5) * x + 8) * x - 4) * a }
        return 0
    }

    /// For each output pixel: the first contributing input pixel, how many contribute, and their weights.
    private static func coefficients(_ inSize: Int, _ outSize: Int) -> (bounds: [Int], weights: [Int32], size: Int) {
        let scale = Double(inSize) / Double(outSize)
        let filterScale = max(scale, 1)
        let support = 2 * filterScale
        let size = Int(support.rounded(.up)) * 2 + 1
        var bounds = [Int](repeating: 0, count: outSize * 2)
        var weights = [Int32](repeating: 0, count: outSize * size)
        var row = [Double](repeating: 0, count: size)
        for out in 0..<outSize {
            let center = (Double(out) + 0.5) * scale
            let first = max(Int(center - support + 0.5), 0)
            let count = min(Int(center + support + 0.5), inSize) - first
            var total = 0.0
            for x in 0..<size {
                row[x] = x < count ? filter((Double(x + first) - center + 0.5) / filterScale) : 0
                total += row[x]
            }
            for x in 0..<size {
                let weight = x < count && total != 0 ? row[x] / total : row[x]
                weights[out * size + x] = Int32(weight * Double(1 << precision) + (weight < 0 ? -0.5 : 0.5))
            }
            bounds[out * 2] = first
            bounds[out * 2 + 1] = count
        }
        return (bounds, weights, size)
    }

    private static func clip(_ value: Int32) -> UInt8 { UInt8(clamping: value >> precision) }

    private static func horizontal(_ src: UnsafePointer<UInt8>, _ inWidth: Int, _ rows: Int, _ outWidth: Int)
        -> [UInt8] {
        let (bounds, weights, size) = coefficients(inWidth, outWidth)
        var out = [UInt8](repeating: 0, count: outWidth * rows * 3)
        out.withUnsafeMutableBufferPointer { out in
            weights.withUnsafeBufferPointer { weights in
                for y in 0..<rows {
                    for x in 0..<outWidth {
                        var p = src + (y * inWidth + bounds[x * 2]) * 3
                        var r: Int32 = 1 << (precision - 1), g = r, b = r
                        for k in 0..<bounds[x * 2 + 1] {
                            let w = weights[x * size + k]
                            r &+= Int32(p[0]) &* w
                            g &+= Int32(p[1]) &* w
                            b &+= Int32(p[2]) &* w
                            p += 3
                        }
                        let o = (y * outWidth + x) * 3
                        out[o] = clip(r)
                        out[o + 1] = clip(g)
                        out[o + 2] = clip(b)
                    }
                }
            }
        }
        return out
    }

    private static func vertical(_ src: UnsafePointer<UInt8>, _ inHeight: Int, _ rowWidth: Int, _ outHeight: Int)
        -> [UInt8] {
        let (bounds, weights, size) = coefficients(inHeight, outHeight)
        let stride = rowWidth * 3
        var out = [UInt8](repeating: 0, count: stride * outHeight)
        var sums = [Int32](repeating: 0, count: stride)
        out.withUnsafeMutableBufferPointer { out in
            sums.withUnsafeMutableBufferPointer { sums in
                for y in 0..<outHeight {
                    for i in 0..<stride { sums[i] = 1 << (precision - 1) }
                    for k in 0..<bounds[y * 2 + 1] {
                        let row = src + (bounds[y * 2] + k) * stride
                        let w = weights[y * size + k]
                        for i in 0..<stride { sums[i] &+= Int32(row[i]) &* w }
                    }
                    for i in 0..<stride { out[y * stride + i] = clip(sums[i]) }
                }
            }
        }
        return out
    }
}
