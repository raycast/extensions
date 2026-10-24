// How fast this Mac is next to the M4 Pro behind `Costs`, with no model: Metal and Vision. Platform/Portable has the
// same names for Linux and Windows.
#if canImport(MetalPerformanceShaders)
import CoreGraphics
import CoreText
import Foundation
import Metal
import MetalPerformanceShaders

extension MeasuredCosts.Speed {
    /// The same work on the M4 Pro (14-core CPU, 20-core GPU) the fixed costs were measured on (2026-10-12): 20
    /// multiplies of two 2048×2048 float16 matrices, and Vision reading `sampleScreen()` once it has warmed up (the best
    /// of a few tries each).
    public static let baseline = (multiplies: 0.046, ocr: 0.43)

    /// About a second of work: the GPU's matrix multiplies (most of what the model does, its image and audio encoders
    /// included) and Vision's text recognition (a screenshot's OCR runs beside the model and usually sets its pace).
    /// Nil when there's no Metal device.
    public static func measure() -> MeasuredCosts.Speed? {
        measuredSeconds().map(compared)
    }

    /// Raw seconds as a speed next to `baseline`.
    public static func compared(_ seconds: (multiplies: Double, ocr: Double)) -> MeasuredCosts.Speed {
        MeasuredCosts.Speed(embedding: seconds.multiplies / baseline.multiplies, ocr: seconds.ocr / baseline.ocr)
    }

    /// The raw seconds (`digup speed` prints them; `baseline` holds the M4 Pro's).
    public static func measuredSeconds() -> (multiplies: Double, ocr: Double)? {
        guard let multiplies = matrixSeconds(), let ocr = ocrSeconds() else { return nil }
        return (multiplies, ocr)
    }

    private static func matrixSeconds() -> Double? {
        guard let device = MTLCreateSystemDefaultDevice(), let queue = device.makeCommandQueue() else { return nil }
        let side = 2048, rowBytes = 2048 * MemoryLayout<UInt16>.stride
        let descriptor = MPSMatrixDescriptor(rows: side, columns: side, rowBytes: rowBytes, dataType: .float16)
        guard let a = device.makeBuffer(length: side * rowBytes), let b = device.makeBuffer(length: side * rowBytes),
              let c = device.makeBuffer(length: side * rowBytes) else { return nil }
        let left = MPSMatrix(buffer: a, descriptor: descriptor), right = MPSMatrix(buffer: b, descriptor: descriptor)
        let result = MPSMatrix(buffer: c, descriptor: descriptor)
        let multiply = MPSMatrixMultiplication(device: device, transposeLeft: false, transposeRight: false,
                                               resultRows: side, resultColumns: side, interiorColumns: side,
                                               alpha: 1, beta: 0)
        func run(_ count: Int) -> Double? {
            guard let buffer = queue.makeCommandBuffer() else { return nil }
            for _ in 0..<count {
                multiply.encode(commandBuffer: buffer, leftMatrix: left, rightMatrix: right, resultMatrix: result)
            }
            let started = Date()
            buffer.commit()
            buffer.waitUntilCompleted()
            return Date().timeIntervalSince(started)
        }
        _ = run(4)   // the kernel compiles, the clocks come up
        return (0..<3).compactMap { _ in run(20) }.min()
    }

    private static func ocrSeconds() -> Double? {
        guard let image = sampleScreen() else { return nil }
        _ = OCR.text(in: image)   // Vision loads its models the first time
        return (0..<2).map { _ in
            let started = Date()
            _ = OCR.text(in: image)
            return Date().timeIntervalSince(started)
        }.min()
    }

    /// A made-up screenshot: 1440×900 with 30 lines of small text, like a window of notes.
    private static func sampleScreen() -> CGImage? {
        let width = 1440, height = 900
        guard let context = CGContext(data: nil, width: width, height: height, bitsPerComponent: 8, bytesPerRow: 0,
                                      space: CGColorSpaceCreateDeviceRGB(),
                                      bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue) else { return nil }
        context.setFillColor(CGColor(red: 1, green: 1, blue: 1, alpha: 1))
        context.fill(CGRect(x: 0, y: 0, width: width, height: height))
        let font = CTFontCreateWithName("Helvetica" as CFString, 15, nil)
        let words = ["invoice", "payment", "declined", "meeting", "Tuesday", "the", "project", "notes", "about", "budget",
                     "travel", "Kyoto", "error", "server", "report", "lunch", "with", "draft", "review", "march"]
        for line in 0..<30 {
            let text = (0..<12).map { words[($0 * 7 + line * 3) % words.count] }.joined(separator: " ")
            let attributed = NSAttributedString(string: text, attributes: [
                NSAttributedString.Key(kCTFontAttributeName as String): font,
                NSAttributedString.Key(kCTForegroundColorAttributeName as String): CGColor(red: 0, green: 0, blue: 0, alpha: 1),
            ])
            context.textPosition = CGPoint(x: 40, y: height - 40 - line * 28)
            CTLineDraw(CTLineCreateWithAttributedString(attributed), context)
        }
        return context.makeImage()
    }
}
#endif
