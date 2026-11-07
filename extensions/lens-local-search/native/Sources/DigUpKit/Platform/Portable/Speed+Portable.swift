// Linux and Windows: no speed check yet (the fixed costs stand in until indexing has measured this machine's).
#if !canImport(MetalPerformanceShaders)
import Foundation

extension MeasuredCosts.Speed {
    public static func measure() -> MeasuredCosts.Speed? { nil }
    public static func measuredSeconds() -> (multiplies: Double, ocr: Double)? { nil }
    public static func compared(_ seconds: (multiplies: Double, ocr: Double)) -> MeasuredCosts.Speed {
        MeasuredCosts.Speed(embedding: 1, ocr: 1)
    }
}
#endif
