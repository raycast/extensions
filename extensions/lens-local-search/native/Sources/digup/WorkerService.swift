import DigUpKit
import Foundation
import LlamaRuntime

/// `digup worker [--text-only]`: EmbeddingGemma 2 on llama.cpp as a process, speaking the JSON-lines protocol of
/// `worker/digup_worker.py` (see `EmbeddingWorker`). The app runs one as its query encoder, so the model's memory
/// goes back to the system when it exits. llama.cpp's warnings go to stderr.
func workerService(_ args: Arguments) -> Int32 {
    let embedder: LlamaEmbedder
    do {
        embedder = try LlamaEmbedder(models: try LlamaModels.locate(), textOnly: args.flags.contains("--text-only"))
    } catch {
        emit(["ready": false, "error": "\(error)"])
        return 1
    }
    let info = embedder.info
    let infoFields: [String: Any] = [
        "model": info.model, "revision": info.revision, "runtime": info.runtime, "dtype": info.dtype, "dim": info.dim,
        "text_only": info.textOnly, "load_seconds": info.loadSeconds ?? 0,
    ]
    emit(["ready": true, "info": infoFields])
    while let line = readLine() {
        guard let data = line.data(using: .utf8),
              let request = try? JSONSerialization.jsonObject(with: data) as? [String: Any] else { continue }
        let id: Any = request["id"] ?? NSNull()
        let inputs = request["inputs"] as? [String] ?? []
        do {
            let embeddings: [Embedding]
            switch request["op"] as? String {
            case "quit":
                emit(["id": id, "ok": true])
                embedder.close()
                return 0
            case "info":
                emit(["id": id, "ok": true, "info": infoFields])
                continue
            case "text":
                embeddings = try embedder.embedTexts(inputs).map { Embedding(vector: $0, error: nil) }
            case "image":
                embeddings = try embedder.embedImages(inputs, budget: request["budget"] as? Int ?? 280)
            case "audio":
                embeddings = try embedder.embedAudio(inputs)
            case let op:
                throw CLIError("unknown op \(op ?? "(none)")")
            }
            // Float32 little-endian, one row per input; an input that failed gets zeros and a message.
            let floats = embeddings.flatMap { $0.vector ?? [Float](repeating: 0, count: info.dim) }
            emit(["id": id, "ok": true, "dim": info.dim, "count": inputs.count,
                  "vectors": floats.withUnsafeBufferPointer { Data(buffer: $0) }.base64EncodedString(),
                  "errors": embeddings.map { $0.error.map { $0 as Any } ?? NSNull() }])
        } catch {
            emit(["id": id, "ok": false, "error": String("\(error)".prefix(500))])
        }
    }
    embedder.close()
    return 0
}
