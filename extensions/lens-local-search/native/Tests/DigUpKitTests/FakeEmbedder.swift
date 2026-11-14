import Foundation
@testable import DigUpKit

/// Vectors without a model: the same text always gets the same unit vector. Counts what it was asked to embed.
final class FakeEmbedder: Embedder {
    let info = WorkerInfo(model: "fake", revision: "0000000", runtime: "test", dtype: "f32", dim: Vectors.dimension,
                          textOnly: false, loadSeconds: nil)
    private(set) var texts = 0

    static func vector(for text: String) -> [Float] {
        var state = UInt64(5381)
        for byte in text.utf8 { state = state &* 33 &+ UInt64(byte) }
        var values = (0..<Vectors.dimension).map { _ -> Float in
            state ^= state << 13; state ^= state >> 7; state ^= state << 17
            return Float(Int64(bitPattern: state % 2001) - 1000) / 1000
        }
        let norm = values.reduce(0) { $0 + $1 * $1 }.squareRoot()
        values = values.map { $0 / norm }
        return values
    }

    func embedTexts(_ texts: [String]) throws -> [[Float]] {
        self.texts += texts.count
        return texts.map(Self.vector(for:))
    }

    func embedImages(_ paths: [String], budget: Int) throws -> [Embedding] {
        paths.map { Embedding(vector: Self.vector(for: $0), error: nil) }
    }

    func embedAudio(_ paths: [String]) throws -> [Embedding] {
        paths.map { Embedding(vector: Self.vector(for: $0), error: nil) }
    }

    func close() {}
}
