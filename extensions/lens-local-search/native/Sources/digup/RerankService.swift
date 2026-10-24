import DigUpKit
import LlamaRuntime
import Foundation

func rerankService(_ args: Arguments) throws -> Int32 {
    guard let folder = args.values["--to"] else { throw CLIError("No local relevance model folder") }
    var model: LocalReranker?
    defer { model?.close() }
    while let line = readLine() {
        guard line.utf8.count <= 300_000, let bytes = line.data(using: .utf8),
              let request = try JSONSerialization.jsonObject(with: bytes) as? [String: Any],
              let query = request["query"] as? String, !query.isEmpty, query.count <= 512,
              let candidates = request["candidates"] as? [[String: Any]], !candidates.isEmpty, candidates.count <= 24 else { throw CLIError("Invalid relevance request") }
        let started = Date()
        var prepared: [(id: String, text: String, image: String?)] = [], ids = Set<String>()
        for candidate in candidates {
            guard let id = candidate["id"] as? String, !id.isEmpty, id.count < 100, ids.insert(id).inserted,
                  let text = candidate["text"] as? String, text.count <= 5000,
                  candidate["image"] == nil || candidate["image"] is String else { throw CLIError("Invalid relevance candidate") }
            let image = candidate["image"] as? String
            if let image {
                let roots = args.positional.map { FolderSelection.realPath($0) } + [args.indexFolder.appendingPathComponent("previews").path]
                let real = FolderSelection.realPath(image)
                guard !Searcher.fileMetadata(paths: [real], roots: roots, skipped: []).isEmpty else { throw CLIError("Relevance image is outside chosen folders") }
            }
            prepared.append((id, text, image))
        }
        if model == nil { model = try LocalReranker(folder: Arguments.folderURL(folder), log: args.indexFolder.appendingPathComponent("reranker.log")) }
        var scores: [String: Double] = [:]
        for candidate in prepared {
            try? Data().write(to: args.indexFolder.appendingPathComponent("search-activity"), options: .atomic)
            scores[candidate.id] = try model!.score(query: query, text: candidate.text, image: candidate.image)
        }
        emit(["scores": scores, "ms": Int(Date().timeIntervalSince(started) * 1000)])
    }
    return 0
}
