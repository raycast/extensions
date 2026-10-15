import DigUpKit
import Foundation

/// `digup search-service`: the app's searcher as a process, for shells that can't link DigUpKit (the Windows and Linux
/// shell). It keeps the index open and the query encoder warm, so a search while typing costs what it costs
/// in the Mac app (tens of milliseconds), not a process start.
///
/// Protocol: one JSON request per line on stdin, one JSON response per line on stdout, carrying the request's `id`.
///   {"op":"files","name_contains":…, "extensions":[…],"code":bool,"limit":n} → metadata-only literal matches
///   {"op":"stat","paths":[…]} → local metadata without reading cloud placeholders or following links
///   --catalog restricts the session to metadata/status/reload/quit and leaves active previews alone.
///   {"op":"search","q":…,"code":bool,"kinds":[…],"limit":n,"meaning":bool,"prefix_last":bool}
///       → {"hits":[…], "strong":n, "meaning":bool, "ms":{"embed":…,"search":…}}
///         `meaning` false: keyword-only (while typing, or while the encoder isn't ready); `strong`: the weaker-matches
///         fold (`Searcher.strongCount`); each hit has the fields of `digup search --json` plus segment_id, modified,
///         size and info.
///   {"op":"embed_ahead","q":…,"code":bool}   → {"ok":true}: embeds and caches the text (the panel sends what's typed so
///                                               far on every keystroke, so the pause's vector is usually ready)
///   {"op":"text","segment":id,"code":bool}    → {"text":…}: the part of a file a hit points at, for the preview
///   {"op":"render","path":…,"kind":"pdf|video|image","loc":n,"pixels":n} → {"image":path}: a JPEG for a preview or a
///                                               thumbnail (a PDF's page `loc`, a video's frame at `loc` seconds, or a
///                                               picture a web view can't show, such as HEIC), made beside the requests
///                                               (typing never waits on one) and kept in <index>/previews until the
///                                               next start
///   {"op":"reload"}                           → {"ok":true,"vectors":n,"code_vectors":n}: after indexing changed the index
///   {"op":"folders","roots":[…],"skipped":[…],"types":[…],"code_roots":[…],"code_skipped":[…]} → {"ok":true}
///   {"op":"prewarm"}                          → {"ok":true}: starts the encoder and loads the vectors (the panel opening)
///   {"op":"status"}                           → {"encoder":"stopped|starting|ready|unavailable","vectors":n,…}
///   {"op":"quit"}                             → {"ok":true}, then exit
/// The encoder exits after `--encoder-idle` seconds without a query and the vectors are released (as in the app);
/// keyword search keeps working and the next query brings both back.
final class SearchService: @unchecked Sendable {   // its state is guarded by `lock`
    private let directory: URL
    private var store: IndexStore
    private var searcher: Searcher
    private var codeStore: IndexStore?
    private var codeSearcher: Searcher?
    private var roots: [String], skipped: [String], types: Set<String>, codeRoots: [String], codeSkipped: [String]
    private let catalog: Bool
    private let idleSeconds: Double
    private let log: URL

    private var encoder: (any Embedder)?
    private var encoderState = "stopped"
    private var vectorCache: [String: [Float]] = [:]
    private var lastQuery = Date()
    private var warnedAboutSource = false
    private let lock = NSLock()
    private let output = NSLock()
    /// Renders for previews: two at a time, beside the request loop, each made once per file version.
    private let previews: URL
    private var rendered: [String: String] = [:]
    private let renderLock = NSLock()
    private let renderSlots = DispatchSemaphore(value: 2)

    init(index: URL, roots: [String], skipped: [String], types: Set<String>, codeRoots: [String],
         codeSkipped: [String], idleSeconds: Double, catalog: Bool = false) throws {
        directory = index
        store = try IndexStore(directory: index, file: IndexStore.mainFile)
        searcher = try Searcher(store: store, loadVectors: false)
        self.roots = roots.map(FolderSelection.realPath)
        self.skipped = skipped.map(FolderSelection.realPath)
        self.types = types
        self.codeRoots = codeRoots.map(FolderSelection.realPath)
        self.codeSkipped = codeSkipped.map(FolderSelection.realPath)
        self.catalog = catalog
        self.idleSeconds = idleSeconds
        log = index.appendingPathComponent("worker-query.log")
        previews = index.appendingPathComponent("previews")
        if !catalog {
            try FileManager.default.createDirectory(at: previews, withIntermediateDirectories: true)
            // Other live search sessions may still display these files.
            for file in (try? FileManager.default.contentsOfDirectory(at: previews, includingPropertiesForKeys: [.contentModificationDateKey])) ?? [] {
                if let date = try? file.resourceValues(forKeys: [.contentModificationDateKey]).contentModificationDate,
                   date.timeIntervalSinceNow < -86400 { try? FileManager.default.removeItem(at: file) }
            }
        }
        try openCode()
    }

    private func openCode() throws {
        guard !codeRoots.isEmpty || FileManager.default.fileExists(atPath: directory.appendingPathComponent(IndexStore.codeFile).path)
        else { return }
        let store = try IndexStore(directory: directory, file: IndexStore.codeFile)
        codeStore = store
        codeSearcher = try Searcher(store: store, loadVectors: false)
    }

    func serve() -> Int32 {
        Thread.detachNewThread { [self] in idleWatch() }
        while let line = readLine() {
            guard let data = line.data(using: .utf8),
                  let request = try? JSONSerialization.jsonObject(with: data) as? [String: Any] else { continue }
            let id: Any = request["id"] ?? NSNull()
            var reply: [String: Any]
            do {
                guard let op = request["op"] as? String else { throw CLIError("no op") }
                guard !catalog || ["files", "stat", "status", "reload", "quit"].contains(op) else { throw CLIError("unsupported catalog operation") }
                if op == "quit" {
                    write(["id": id, "ok": true])
                    lock.withLock { stopEncoder() }
                    return 0
                }
                if op == "render" {
                    renderSlots.wait()
                    let request = UncheckedSendable(request)
                    Thread.detachNewThread { [self] in
                        defer { renderSlots.signal() }
                        var reply: [String: Any]
                        do { reply = try render(request.value) } catch {
                            reply = ["ok": false, "error": String("\(error)".prefix(500))]
                        }
                        reply["id"] = request.value["id"] ?? NSNull()
                        write(reply)
                    }
                    continue
                }
                reply = try lock.withLock { try handle(op, request) }
            } catch {
                reply = ["ok": false, "error": String("\(error)".prefix(500))]
            }
            reply["id"] = id
            write(reply)
        }
        lock.withLock { stopEncoder() }
        return 0
    }

    private func predicate(_ request: [String: Any]) throws -> FilePredicate? {
        guard let raw = request["filter"] else { return nil }
        guard JSONSerialization.isValidJSONObject(raw) else { throw CLIError("invalid search predicate") }
        let data = try JSONSerialization.data(withJSONObject: raw)
        guard data.count <= 32_768 else { throw CLIError("search predicate is too large") }
        let filter = try JSONDecoder().decode(FilePredicate.self, from: data)
        guard filter.valid() else { throw CLIError("invalid search predicate") }
        return filter
    }

    private func handle(_ op: String, _ request: [String: Any]) throws -> [String: Any] {
        if ["search", "prewarm", "embed_ahead"].contains(op), !catalog {
            try? Data().write(to: directory.appendingPathComponent("search-activity"), options: .atomic)
        }
        switch op {
        case "stat":
            let paths = request["paths"] as? [String] ?? []
            guard paths.count <= 100_000, paths.allSatisfy({ $0.hasPrefix("/") && !$0.contains("\0") }) else { throw CLIError("invalid metadata paths") }
            let files = Searcher.fileMetadata(paths: paths, roots: roots + codeRoots, skipped: skipped + codeSkipped)
            return ["files": files.map { ["path": $0.path, "size": $0.size, "modified": $0.modified] as [String: Any] }]
        case "files":
            guard let match = FilenameMatch(rawValue: request["name_match"] as? String ?? "contains") else { throw CLIError("invalid filename match") }
            let code = request["code"] as? Bool ?? false
            let extensions = Set((request["extensions"] as? [String] ?? []).map { $0.lowercased() })
            let kinds = Set((request["kinds"] as? [String] ?? []).compactMap(FileKind.init(rawValue:)))
            var after: (modified: Double, path: String)?
            if let raw = request["after"] {
                guard let cursor = raw as? [String: Any], let modified = cursor["modified"] as? Double, modified.isFinite,
                      let path = cursor["path"] as? String, path.hasPrefix("/"), !path.contains("\0") else { throw CLIError("invalid file cursor") }
                after = (modified, path)
            }
            let hits = try (code ? codeSearcher : searcher)?.files(roots: code ? codeRoots : roots,
                skipped: code ? codeSkipped : skipped, extensions: extensions, excludingExtensions: types,
                containing: request["name_contains"] as? String, matching: match, filter: try predicate(request),
                limit: min(catalog ? 500_000 : 100_000, max(0, request["limit"] as? Int ?? 200)), kinds: kinds, after: after) ?? []
            return ["hits": hits.map(hitFields), "strong": hits.count, "meaning": false]
        case "search":
            let filter = try predicate(request)
            let text = request["q"] as? String ?? ""
            let code = request["code"] as? Bool ?? false
            let kinds = (request["kinds"] as? [String]).map { Set($0.compactMap(FileKind.init(rawValue:))) }
            let limit = request["limit"] as? Int ?? 40
            let wantMeaning = request["meaning"] as? Bool ?? true
            let prefixLast = request["prefix_last"] as? Bool ?? false
            let started = Date()
            var vector: [Float]?
            var warning: String?
            if wantMeaning, !text.isEmpty {
                vector = self.vector(for: text, code: code)
                // Vectors from another model or runtime must never meet: keyword-only then, and say so once.
                if vector != nil, let indexed = (code ? codeSearcher : searcher)?.vectorSource,
                   let source = encoder?.info.vectorSource, indexed != source {
                    vector = nil
                    if !warnedAboutSource {
                        warning = "meaning search is off: the index was built with \(indexed), the encoder is \(source)"
                        warnedAboutSource = true
                    }
                }
            }
            let subject = request["focus_q"] as? String
            let focusVector = vector != nil && subject != nil && subject != text ? self.vector(for: subject!, code: code) : nil
            let embedded = Date()
            let hits: [SearchHit]
            if code {
                guard let codeSearcher else { return ["hits": [], "strong": 0, "meaning": false] }
                hits = try codeSearcher.search(text, queryVector: vector, limit: min(200, max(0, limit)), prefixLast: prefixLast, focusVector: focusVector, filter: filter, inScope: { FolderSelection.isSearched($0, folders: self.codeRoots, skipped: self.codeSkipped) }, candidatePool: request["candidate_pool"] as? Bool ?? false).filter {
                    FolderSelection.isSearched($0.path, folders: codeRoots, skipped: codeSkipped)
                        && FileManager.default.fileExists(atPath: $0.path)
                }
            } else {
                hits = try searcher.search(text, queryVector: vector, kinds: kinds, limit: min(200, max(0, limit)), prefixLast: prefixLast, focusVector: focusVector, filter: filter, inScope: { (self.roots.isEmpty || FolderSelection.isSearched($0, folders: self.roots, skipped: self.skipped)) && !self.types.contains(($0 as NSString).pathExtension.lowercased()) }, candidatePool: request["candidate_pool"] as? Bool ?? false)
                    .filter {
                        (roots.isEmpty || FolderSelection.isSearched($0.path, folders: roots, skipped: skipped))
                            && !types.contains(($0.path as NSString).pathExtension.lowercased())
                            && FileManager.default.fileExists(atPath: $0.path)
                    }
            }
            var reply: [String: Any] = [
                "hits": hits.map(hitFields), "strong": Searcher.strongCount(hits), "meaning": vector != nil,
                "ms": ["embed": Int(embedded.timeIntervalSince(started) * 1000),
                       "search": Int(Date().timeIntervalSince(embedded) * 1000)],
            ]
            if let warning { reply["warning"] = warning }
            return reply
        case "embed_ahead":
            _ = vector(for: request["q"] as? String ?? "", code: request["code"] as? Bool ?? false)
            return ["ok": true]
        case "text":
            guard let segment = (request["segment"] as? NSNumber)?.int64Value else { throw CLIError("which segment?") }
            let code = request["code"] as? Bool ?? false
            let source = code ? codeSearcher : searcher
            return ["text": try source?.text(ofSegment: segment) ?? NSNull(),
                    "context": try source?.context(ofSegment: segment) ?? NSNull()]
        case "reload":
            let hadVectors = searcher.vectorsLoaded
            searcher = try Searcher(store: store, loadVectors: hadVectors)
            if let codeStore {
                codeSearcher = try Searcher(store: codeStore, loadVectors: codeSearcher?.vectorsLoaded ?? false)
            } else {
                try openCode()
            }
            return ["ok": true, "vectors": searcher.vectorCount, "code_vectors": codeSearcher?.vectorCount ?? 0]
        case "folders":
            if let value = request["roots"] as? [String] { roots = value.map { FolderSelection.realPath(Arguments.folderURL($0).path) } }
            if let value = request["skipped"] as? [String] { skipped = value.map { FolderSelection.realPath(Arguments.folderURL($0).path) } }
            if let value = request["types"] as? [String] { types = IndexOptions.extensions(value.joined(separator: ",")) }
            if let value = request["code_roots"] as? [String] { codeRoots = value.map { FolderSelection.realPath(Arguments.folderURL($0).path) } }
            if let value = request["code_skipped"] as? [String] { codeSkipped = value.map { FolderSelection.realPath(Arguments.folderURL($0).path) } }
            if codeSearcher == nil { try openCode() }
            return ["ok": true]
        case "prewarm":
            lastQuery = Date()
            if encoderState == "unavailable" { encoderState = "stopped" }
            _ = runningEncoder()
            if !searcher.vectorsLoaded { try searcher.reload() }
            return ["ok": true, "encoder": encoderState, "vectors": searcher.vectorCount]
        case "status":
            return ["encoder": encoderState, "vectors": searcher.vectorsLoaded ? searcher.vectorCount : 0,
                    "code_vectors": codeSearcher?.vectorsLoaded == true ? codeSearcher!.vectorCount : 0,
                    "index": store.file.path]
        default:
            throw CLIError("unknown op \(op)")
        }
    }

    private func write(_ fields: [String: Any]) {
        output.withLock { emit(fields) }
    }

    // MARK: Previews

    private func render(_ request: [String: Any]) throws -> [String: Any] {
        guard let path = request["path"] as? String else { throw CLIError("which file?") }
        let kind = request["kind"] as? String ?? "image"
        let loc = (request["loc"] as? NSNumber)?.doubleValue
        let pixels = min(max(request["pixels"] as? Int ?? 1024, 32), 2048)
        let modified = (try? FileManager.default.attributesOfItem(atPath: path)[.modificationDate] as? Date)?
            .timeIntervalSince1970 ?? 0
        let key = "\(path)|\(modified)|\(kind)|\(loc ?? -1)|\(pixels)"
        if let done = renderLock.withLock({ rendered[key] }), FileManager.default.fileExists(atPath: done) {
            return ["image": done]
        }
        let image = try PreviewImages.make(PreviewImages.Kind(rawValue: kind) ?? .image, of: path, at: loc,
                                           pixels: pixels, in: previews)
        renderLock.withLock { rendered[key] = image }
        return ["image": image]
    }

    // MARK: The query encoder

    /// The query's vector (cached), or nil when the encoder can't run: keyword results still work.
    private func vector(for text: String, code: Bool) -> [Float]? {
        lastQuery = Date()
        let key = (code ? "code\u{0}" : "") + text
        if let cached = vectorCache[key] { return cached }
        guard let encoder = runningEncoder() else { return nil }
        do {
            let values = try encoder.embedTexts([code ? Prompts.codeQuery(text) : Prompts.query(text)]).first ?? []
            if vectorCache.count > 256 { vectorCache.removeAll() }
            vectorCache[key] = values
            return values
        } catch {
            FileHandle.standardError.write(Data("encoder: \(error)\n".utf8))
            stopEncoder()   // the next query starts a new one
            return nil
        }
    }

    private func runningEncoder() -> (any Embedder)? {
        if let encoder { return encoder }
        guard encoderState != "unavailable" else { return nil }
        encoderState = "starting"
        do {
            let started = Date()
            let worker = try makeEmbedder(textOnly: true, log: log, qos: .userInitiated)
            encoder = worker
            encoderState = "ready"
            write(["event": "encoder", "state": "ready", "seconds": (Date().timeIntervalSince(started) * 100).rounded() / 100,
                  "source": worker.info.vectorSource])
            return worker
        } catch {
            encoderState = "unavailable"
            write(["event": "encoder", "state": "unavailable", "error": String("\(error)".prefix(300))])
            return nil
        }
    }

    private func stopEncoder() {
        encoder?.close()
        encoder = nil
        vectorCache.removeAll()
        if encoderState != "unavailable" { encoderState = "stopped" }
    }

    /// After `idleSeconds` without a query the model and the vectors go (their memory back to the system).
    private func idleWatch() {
        while true {
            Thread.sleep(forTimeInterval: 1)
            lock.withLock {
                guard encoder != nil || searcher.vectorsLoaded, Date().timeIntervalSince(lastQuery) > idleSeconds
                else { return }
                stopEncoder()
                searcher.releaseVectors()
                codeSearcher?.releaseVectors()
                write(["event": "encoder", "state": "stopped", "reason": "idle"])
            }
        }
    }
}

/// A value handed to another thread that only that thread uses from then on.
private struct UncheckedSendable<Value>: @unchecked Sendable {
    let value: Value
    init(_ value: Value) { self.value = value }
}

/// A hit as JSON: what `digup search --json` prints, plus what a shell's preview needs.
func hitFields(_ hit: SearchHit) -> [String: Any] {
    var row: [String: Any] = ["path": hit.path, "kind": hit.kind.rawValue, "segment": hit.segment.rawValue,
                              "segment_id": hit.segmentID, "score": hit.score, "modified": hit.modified,
                              "size": hit.size, "info": hit.info]
    if !hit.passages.isEmpty {
        row["passages"] = hit.passages.map { passage -> [String: Any] in
            var value: [String: Any] = ["segment": passage.segment.rawValue, "segment_id": passage.segmentID]
            if let loc = passage.loc { value["loc"] = loc }
            if let excerpt = passage.excerpt { value["excerpt"] = excerpt }
            return value
        }
    }
    if let z = hit.z { row["z"] = z }
    if let cosine = hit.cosine { row["cosine"] = cosine }
    if let rank = hit.keywordRank { row["keyword_rank"] = rank }
    if let loc = hit.loc { row["loc"] = loc }
    if let end = hit.locEnd { row["loc_end"] = end }
    if let focus = hit.focus { row["focus"] = focus }
    if let excerpt = hit.excerpt { row["excerpt"] = excerpt }
    return row
}

func searchService(_ args: Arguments) throws -> Int32 {
    let service = try SearchService(
        index: args.indexFolder,
        roots: args.positional.map { Arguments.folderURL($0).path },
        skipped: (args.lists["--exclude"] ?? []).map { Arguments.folderURL($0).path },
        types: IndexOptions.extensions((args.lists["--exclude-ext"] ?? []).joined(separator: ",")),
        codeRoots: (args.lists["--code-root"] ?? []).map { Arguments.folderURL($0).path },
        codeSkipped: (args.lists["--code-exclude"] ?? []).map { Arguments.folderURL($0).path },
        idleSeconds: args.values["--encoder-idle"].flatMap(Double.init) ?? 300,
        catalog: args.flags.contains("--catalog"))
    emit(["event": "ready", "index": args.indexFolder.path])
    return service.serve()
}
