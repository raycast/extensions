import DigUpKit
import Foundation
import Testing
@testable import LlamaRuntime

/// The vectors this build makes for fixed inputs, against the ones `LlamaEmbedder.vectorVersion` stands for
/// (Reference/vectors.json). Indexes record that version, not the llama.cpp build, so every llama.cpp update must pass
/// this before it ships. If it fails, keep the old llama.cpp, or bump `vectorVersion` (every index then embeds again)
/// and write the reference anew: `DIGUP_WRITE_REFERENCE=1 swift test --filter ReferenceVectorTests`.
///
/// The inputs go in as the indexer hands them over: texts with the app's prompts, a screenshot as PNG (280 tokens), a
/// photo as JPEG (140, and 70 as a video frame) and a 16 kHz WAV, all read by llama.cpp's own decoders
/// (scripts/testbed/make_reference_inputs.py made the files). Needs the model files; skipped without them.
@Suite struct ReferenceVectorTests {
    static let folder = URL(fileURLWithPath: #filePath).deletingLastPathComponent().appendingPathComponent("Reference")
    static let modelsThere = (try? LlamaModels.locate())?.media != nil
    /// Each vector's cosine with its reference must stay at least this: runtimes that agree (mlx-vlm and llama.cpp)
    /// measure ≥ 0.999, and less is a change people would see in their results.
    static let agreement: Float = 0.999

    static let texts: [(name: String, text: String)] = [
        ("query", Prompts.query("payment declined error")),
        ("query-bn", Prompts.query("ইলিশ মাছ রান্না")),
        ("query-ar", Prompts.query("متى تغلق المكتبة")),
        ("document", Prompts.document(title: "Tokyo itinerary", text: "Flight to Tokyo Haneda on November 3. Then the "
                                      + "train to Kamakura to see the Great Buddha, and back for dinner in Shibuya.")),
        // About 1,800 tokens: past the sliding attention window, so the global layers count as well.
        ("document-long", Prompts.document(title: nil, text: (1...60).map {
            "Note \($0): the review moved to room \($0 % 7 + 2) because the projector in the main hall failed again, "
                + "and the team agreed to send the slides the night before."
        }.joined(separator: " "))),
    ]
    static let images = [("screen-280", "screen.png", 280), ("photo-140", "photo.jpg", 140), ("frame-70", "photo.jpg", 70)]

    struct Reference: Codable {
        let vectorVersion: Int
        let madeWith: String
        let vectors: [String: [Float]]

        enum CodingKeys: String, CodingKey {
            case vectorVersion = "vector_version", madeWith = "made_with", vectors
        }
    }

    @Test(.enabled(if: modelsThere)) func vectorsMatchTheReference() throws {
        let made = try Self.vectors()
        let url = Self.folder.appendingPathComponent("vectors.json")
        let stored = try? JSONDecoder().decode(Reference.self, from: Data(contentsOf: url))
        if ProcessInfo.processInfo.environment["DIGUP_WRITE_REFERENCE"] == "1" {
            // A new reference for the same version would let indexes mix old and new vectors.
            if let stored, stored.vectorVersion == LlamaEmbedder.vectorVersion,
               let (name, cosine) = Self.worst(made, stored.vectors), cosine < Self.agreement {
                Issue.record("\(name) moved to cosine \(cosine), and vectorVersion is still \(stored.vectorVersion): bump it first")
                return
            }
            let reference = Reference(vectorVersion: LlamaEmbedder.vectorVersion,
                                      madeWith: "llama.cpp \(LlamaEmbedder.buildTag)", vectors: made)
            let encoder = JSONEncoder()
            encoder.outputFormatting = [.sortedKeys]
            try encoder.encode(reference).write(to: url)
            return
        }
        let reference = try #require(stored, "no Reference/vectors.json: write it with DIGUP_WRITE_REFERENCE=1")
        #expect(reference.vectorVersion == LlamaEmbedder.vectorVersion,
                "the reference is for vectors \(reference.vectorVersion): write it anew for \(LlamaEmbedder.vectorVersion)")
        #expect(Set(made.keys) == Set(reference.vectors.keys))
        for (name, vector) in made.sorted(by: { $0.key < $1.key }) {
            guard let expected = reference.vectors[name] else { continue }
            let cosine = zip(vector, expected).reduce(0) { $0 + $1.0 * $1.1 }
            #expect(cosine >= Self.agreement, """
                \(name): cosine \(cosine) with vectors \(reference.vectorVersion) (\(reference.madeWith)). llama.cpp \
                \(LlamaEmbedder.buildTag) makes other vectors: keep the old llama.cpp, or bump vectorVersion
                """)
        }
    }

    static func vectors() throws -> [String: [Float]] {
        let log = FileManager.default.temporaryDirectory.appendingPathComponent("digup-reference-vectors.log")
        let embedder = try LlamaEmbedder(models: LlamaModels.locate(), textOnly: false, log: log)
        defer { embedder.close() }
        var made: [String: [Float]] = [:]
        for (input, vector) in zip(texts, try embedder.embedTexts(texts.map(\.text))) { made[input.name] = vector }
        for (name, file, budget) in images {
            let embedding = try embedder.embedImages([folder.appendingPathComponent(file).path], budget: budget)[0]
            made[name] = try #require(embedding.vector, "\(file): \(embedding.error ?? "no vector")")
        }
        let speech = try embedder.embedAudio([folder.appendingPathComponent("speech.wav").path])[0]
        made["speech"] = try #require(speech.vector, "speech.wav: \(speech.error ?? "no vector")")
        return made
    }

    /// The vector furthest from its reference, as (name, cosine).
    static func worst(_ made: [String: [Float]], _ reference: [String: [Float]]) -> (String, Float)? {
        made.compactMap { name, vector in
            reference[name].map { (name, zip(vector, $0).reduce(0) { $0 + $1.0 * $1.1 }) }
        }.min { $0.1 < $1.1 }
    }
}
