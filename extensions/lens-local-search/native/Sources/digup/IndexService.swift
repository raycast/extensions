import DigUpKit
import Foundation
#if os(Windows)
import WinSDK
#endif

/// `digup index-service`: the app's indexing helper, one process per stretch of work.
///
/// Extraction (Vision OCR, ImageIO, PDFKit, AVFoundation) runs here and not in the app. Vision alone keeps ~100 MB
/// of models cached in whatever process ran OCR (measured: the app went from 16 to 93 MB after indexing 11
/// screenshots, and stayed there), and all of it goes back to the system when this process exits.
///
/// Protocol: one command per line on stdin, one JSON event per line on stdout.
///   stdin:  sync | sync code | stop | backfill on | backfill off      (EOF = stop)
///   stdout: {"event": "missing" | "pruned" | "sync" | "file" | "rest" | "summary" | "waiting" | "idle" | "error" |
///            "exit", ...}; events about the code index say "code": true
///
/// The loop: sync, index what the sync just queued (if it's a few files: new files go first, on any power source),
/// then the backfill if allowed; then the code index the same way (`--code-root`: its own sync, asked for with
/// "sync code"; its folders are crawled with the first sync, so their counts show at once); then the rest of long
/// files (`Indexer.finishLongFiles`) under the same rules. Between batches it yields to stop and to "backfill off" at
/// once, and to a new sync once indexing has had about as long as the last sync took (`yieldAt`). When it's done it
/// keeps a warm worker for `linger` seconds (screenshots come in bursts), then exits.
///
/// Before the model has downloaded it only syncs (file names are searchable at once), says it's "waiting", and exits.
/// Folders that aren't there (an unplugged drive) or can't be read are skipped, and what was indexed from them stays.
/// That's checked before every sync, not once: a drive ejected while this runs must not crawl as "all deleted".
final class IndexService: @unchecked Sendable {
    /// One index: its store, its indexer, its folders.
    struct Part {
        let store: IndexStore
        let indexer: Indexer
        /// The chosen folders, there or not.
        let roots: [URL]
        /// When set, files under none of these folders leave the index (folders taken out of the app).
        let keepOnly: [URL]?
        var code: Bool { store.file.lastPathComponent == IndexStore.codeFile }
    }

    private let main: Part
    /// The code index (`--code-root`), when there are code folders.
    private let code: Part?
    /// The index folder (where `Watchdog` leaves a note about a file it stopped on).
    private let folder: URL
    private let model: SharedEmbedder
    /// The last report of folders that aren't there or can't be read, by index (said again only when it changes).
    private var unavailable: [Bool: (missing: [String], unreadable: [String])] = [:]
    private let modelReady: () -> Bool
    private let newFilesLimit: Int
    private let linger: Double
    private let incremental: Bool
    private let powerAware: Bool

    private let lock = NSLock()
    private var syncRequested = true       // the first thing it does
    private var codeSyncRequested = true
    private var stopRequested = false
    private var backfillAllowed: Bool
    /// A sync asked for while files are being indexed waits until then. A crawl of a big folder can take minutes, and
    /// a folder that keeps changing asks for the next one meanwhile: yielding at once, every pass went back to crawling
    /// before a single file was read. Indexing gets at least as long as the sync before it (2 s at the least).
    private var yieldAt = Date.distantPast
    private let wake = DispatchSemaphore(value: 0)

    init(main: Part, code: Part?, folder: URL, model: SharedEmbedder, modelReady: @escaping () -> Bool,
         backfill: Bool, newFilesLimit: Int, linger: Double, incremental: Bool = false, skipSync: Bool = false, powerAware: Bool = false) {
        self.main = main
        self.code = code
        self.folder = folder
        self.model = model
        self.modelReady = modelReady
        self.backfillAllowed = backfill
        self.newFilesLimit = newFilesLimit
        self.linger = linger
        self.incremental = incremental
        self.powerAware = powerAware
        syncRequested = !skipSync; codeSyncRequested = !skipSync
    }

    private var parts: [Part] { [main] + (code.map { [$0] } ?? []) }
    private var workBlocker: String? {
        guard powerAware else { return nil }
        if let date = try? folder.appendingPathComponent("search-activity").resourceValues(forKeys: [.contentModificationDateKey]).contentModificationDate,
           date.timeIntervalSinceNow > -15 { return "Search in progress" }
        return IndexPower.blocker
    }

    func serve() -> Int32 {
        removeStaleScratchFolders()
        do {
            // A file an earlier helper had to stop on (`Watchdog`) isn't read again until it changes.
            if let stopped = StoppedFile.take(from: folder), let path = stopped.path {
                for part in parts {
                    guard try part.store.markStopped(path, why: stopped.why) else { continue }
                    emit(["event": "stopped", "path": path, "why": stopped.why, "code": part.code])
                }
            }
            let again = try main.store.readAgainOnce()   // what older indexes couldn't read: scans' words, SVGs
            if again > 0 { emit(["event": "rescan", "files": again]) }
            for part in parts {
                _ = availableRoots(part)
                try part.indexer.checkModel()   // a new model: everything is queued again
                if let keepOnly = part.keepOnly {
                    let pruned = try part.store.prune(keepingUnder: keepOnly.map(\.path))
                    if pruned > 0 { emit(["event": "pruned", "files": pruned, "code": part.code]) }
                }
            }
        } catch {
            emit(["event": "error", "message": "\(error)", "fatal": true])
            finish()
            return 1
        }
        Thread.detachNewThread { [self] in readCommands() }
        var newFiles = Set<Int64>(), newCode = Set<Int64>()
        var codeCounted = code == nil
        while true {
            if lock.withLock({ () -> Bool in defer { syncRequested = false }; return syncRequested }) {
                sync(main, into: &newFiles)
            }
            // The code folders are crawled with the first sync, so their counts show from the start (a big first pass
            // of the main index takes hours); their files are read once the main index has nothing waiting, below.
            if !codeCounted, let code {
                codeCounted = true
                if lock.withLock({ () -> Bool in defer { codeSyncRequested = false }; return codeSyncRequested }) {
                    sync(code, into: &newCode)
                }
            }
            if lock.withLock({ stopRequested }) { break }
            if let blocker = workBlocker {
                emitCounts("power_paused", ["reason": blocker]); break
            }
            guard modelReady() else {
                // Nothing to embed with yet; the app starts another helper once the download is done.
                emitCounts("waiting", ["for": "model"])
                break
            }
            if !newFiles.isEmpty {
                guard run(main, only: newFiles) else { break }
                newFiles = left(main, of: newFiles)
                continue
            }
            if (try? main.store.pendingCount()) ?? 0 > 0, lock.withLock({ backfillAllowed }) {
                guard run(main, only: nil) else { break }
                if lock.withLock({ syncRequested }) { continue }
            }
            // Finish readable documents before the bulk code backlog, under the same power and time budget.
            if lock.withLock({ backfillAllowed }), (try? main.store.pendingCount()) ?? 1 == 0 {
                do {
                    let upgraded = try main.indexer.upgradePDFPassages(shouldStop: { [self] in
                        lock.withLock { stopRequested || workBlocker != nil || !backfillAllowed }
                    })
                    if upgraded > 0 { emit(["event": "passages", "files": upgraded]) }
                } catch {
                    emit(["event": "error", "message": "\(error)", "fatal": true]); break
                }
                if (try? main.store.unfinishedCount().files) ?? 0 > 0 {
                    guard finishLongFiles() else { break }
                    if lock.withLock({ syncRequested || codeSyncRequested }) { continue }
                }
            }
            // The code index once the main one has nothing waiting: its own sync (code changes come in a while after
            // they settle), what it just queued at once, the rest under the backfill's rules.
            if let code, (try? main.store.pendingCount()) ?? 1 == 0 || !lock.withLock({ backfillAllowed }) {
                if lock.withLock({ () -> Bool in defer { codeSyncRequested = false }; return codeSyncRequested }) {
                    sync(code, into: &newCode)
                }
                if !newCode.isEmpty {
                    guard run(code, only: newCode) else { break }
                    newCode = left(code, of: newCode)
                    continue
                }
                if (try? code.store.pendingCount()) ?? 0 > 0, lock.withLock({ backfillAllowed }) {
                    guard run(code, only: nil) else { break }
                    if lock.withLock({ syncRequested || codeSyncRequested }) { continue }
                }
            }
            if code != nil, lock.withLock({ codeSyncRequested }) { continue }
            emitCounts("idle")
            // Nothing warm to keep around: leave now. Else wait a little for more work.
            guard model.isRunning, waitForWork() else { break }
        }
        finish()
        emit(["event": "exit"])
        return 0
    }

    private func finish() {
        for part in parts { part.indexer.finish() }
        model.close()
    }

    /// New files a run stopped before (a sync or stop came first): kept for the next round. Done: anything still
    /// pending joins the backfill.
    private func left(_ part: Part, of files: Set<Int64>) -> Set<Int64> {
        let yielded = lock.withLock { syncRequested || stopRequested || (part.code && codeSyncRequested) }
        return yielded ? Set((try? part.store.pending(limit: nil, only: files).map(\.id)) ?? []) : []
    }

    /// Scratch folders ($TMPDIR/DigUp-<pid>) of indexing processes that are gone (killed mid-batch).
    private func removeStaleScratchFolders() {
        let temp = FileManager.default.temporaryDirectory
        for name in (try? FileManager.default.contentsOfDirectory(atPath: temp.path)) ?? [] {
            guard name.hasPrefix("DigUp-"), let pid = Int32(name.dropFirst("DigUp-".count)),
                  pid != ProcessInfo.processInfo.processIdentifier, Self.isGone(pid) else { continue }
            try? FileManager.default.removeItem(at: temp.appendingPathComponent(name))
        }
    }

    /// No process has this id now.
    private static func isGone(_ pid: Int32) -> Bool {
        #if os(Windows)
        guard let process = OpenProcess(DWORD(PROCESS_QUERY_LIMITED_INFORMATION), false, DWORD(pid)) else { return true }
        defer { CloseHandle(process) }
        var code: DWORD = 0
        return GetExitCodeProcess(process, &code) && code != 259   // STILL_ACTIVE
        #else
        return kill(pid, 0) != 0 && errno == ESRCH
        #endif
    }

    /// A part's chosen folders that are there and readable right now; also what `pending` and the counts look at.
    private func availableRoots(_ part: Part) -> [URL] {
        let missing = part.roots.filter { !Arguments.isFolder($0) }
        let unreadable = part.roots.filter { !missing.contains($0) && !Arguments.isReadable($0) }
        let report = (missing.map(\.path), unreadable.map(\.path))
        if unavailable[part.code].map({ $0 != report }) ?? !(missing.isEmpty && unreadable.isEmpty) {
            emit(["event": "missing", "folders": report.0, "unreadable": report.1, "code": part.code])
        }
        unavailable[part.code] = report
        let available = part.roots.filter { !missing.contains($0) && !unreadable.contains($0) }
        part.store.scope = available.map(\.path)
        return available
    }

    private func sync(_ part: Part, into newFiles: inout Set<Int64>) {
        let started = Date()
        defer {
            let took = Date().timeIntervalSince(started)
            lock.withLock { yieldAt = Date() + max(took, 2) }
        }
        do {
            let roots = availableRoots(part)
            let summary = try incremental ? part.indexer.syncChanges(roots) : part.indexer.sync(roots)
            if summary.queued.count <= newFilesLimit { newFiles.formUnion(summary.queued) }
            emitCounts("sync", [
                "code": part.code,
                "new": newFiles.count,   // about to be indexed, whatever the power source
                "added": summary.added, "changed": summary.changed, "moved": summary.moved,
                "removed": summary.removed, "unchanged": summary.unchanged,
                "discovery": summary.discovery, "scanned_directories": summary.scannedDirectories,
                "inaccessible": summary.crawl.unavailable,
                "ms": Int(Date().timeIntervalSince(started) * 1000),
                "started": started.timeIntervalSince1970,   // the app checks its sync request came before this
            ])
        } catch {
            emit(["event": "error", "message": "sync failed: \(error)", "code": part.code])
        }
    }

    /// Embeds a part's pending files (`only` some). False when indexing has to stop (the worker died, or the index was
    /// built with other settings).
    private func run(_ part: Part, only ids: Set<Int64>?) -> Bool {
        let started = Date()
        let isNew = ids != nil
        do {
            let states = try part.indexer.run(only: ids, shouldStop: { [self] in
                lock.withLock {
                    stopRequested || workBlocker != nil || (!isNew && !backfillAllowed)
                        || Date() >= yieldAt && (syncRequested || part.code && codeSyncRequested)
                }
            }, onEvent: { event in
                emit(["event": "file", "new": isNew, "done": event.done, "total": event.total, "path": event.path,
                      "kind": event.kind.rawValue, "state": event.state, "seconds": event.seconds,
                      "note": event.note ?? "", "code": part.code])
            })
            if !states.isEmpty {
                emit(["event": "summary", "new": isNew, "states": states, "code": part.code,
                      "ms": Int(Date().timeIntervalSince(started) * 1000)])
            }
            return true
        } catch {
            emit(["event": "error", "message": "\(error)", "fatal": true, "code": part.code])
            return false
        }
    }

    /// The rest of long files (`Indexer.finishLongFiles`), yielding as the backfill does. False when indexing has to
    /// stop.
    private func finishLongFiles() -> Bool {
        let started = Date()
        do {
            let states = try main.indexer.finishLongFiles(shouldStop: { [self] in
                lock.withLock {
                    stopRequested || workBlocker != nil || !backfillAllowed
                        || Date() >= yieldAt && (syncRequested || codeSyncRequested && code != nil)
                }
            }, onStep: { step in
                emit(["event": "rest", "done": step.done, "total": step.total, "files": step.files, "path": step.path,
                      "kind": step.kind.rawValue, "state": step.state, "seconds": step.seconds, "note": step.note ?? ""])
            })
            if !states.isEmpty {
                emit(["event": "summary", "rest": true, "states": states,
                      "ms": Int(Date().timeIntervalSince(started) * 1000)])
            }
            return true
        } catch {
            emit(["event": "error", "message": "\(error)", "fatal": true])
            return false
        }
    }

    /// Waits up to `linger` seconds for something to do. False: time's up, or told to stop.
    private func waitForWork() -> Bool {
        let deadline = DispatchTime.now() + linger
        while wake.wait(timeout: deadline) == .success {
            let (sync, codeSync, stop, backfill) = lock.withLock {
                (syncRequested, codeSyncRequested, stopRequested, backfillAllowed)
            }
            if stop { return false }
            if sync || codeSync && code != nil { return true }
            if backfill, parts.contains(where: { (try? $0.store.pendingCount()) ?? 0 > 0 })
                || (try? main.store.unfinishedCount().files) ?? 0 > 0 {
                return true
            }
        }
        return false
    }

    private func readCommands() {
        while let line = readLine() {
            lock.withLock {
                switch line.trimmingCharacters(in: .whitespaces) {
                case "sync": syncRequested = true
                case "sync code": codeSyncRequested = true
                case "stop": stopRequested = true
                case "backfill on": backfillAllowed = true
                case "backfill off": backfillAllowed = false
                default: break
                }
            }
            wake.signal()
        }
        lock.withLock { stopRequested = true }   // the app went away
        wake.signal()
    }

    /// An event with both indexes' counts: the main one's as they are, the code index's prefixed "code_".
    private func emitCounts(_ event: String, _ extra: [String: Any] = [:]) {
        var fields = extra
        fields["event"] = event
        for part in parts {
            guard let counts = try? part.store.counts() else { continue }
            let prefix = part.code ? "code_" : ""
            var files = 0, searchable = 0, pending = 0
            for states in counts.byKindAndState.values {
                for (state, count) in states {
                    files += count
                    if state == "done" || state == "partial" { searchable += count }
                    if state == "pending" { pending += count }
                }
            }
            fields[prefix + "files"] = files
            fields[prefix + "searchable"] = searchable
            fields[prefix + "pending"] = pending
            fields[prefix + "vectors"] = counts.vectors
            if !part.code { fields["unfinished"] = counts.unfinished }   // long files with pages or chunks left to read
        }
        emit(fields)
    }
}

/// One model for both indexes, started when the first file needs it and closed when the helper is done. The indexers
/// get it as an `Embedder` whose `close` leaves it be, since the other may be using it.
final class SharedEmbedder: @unchecked Sendable {
    private let make: () throws -> any Embedder
    private var model: (any Embedder)?

    init(_ make: @escaping () throws -> any Embedder) {
        self.make = make
    }

    var isRunning: Bool { model != nil }

    func embedder() throws -> any Embedder {
        if model == nil { model = try make() }
        return Kept(model!)
    }

    func close() {
        model?.close()
        model = nil
    }

    private final class Kept: Embedder {
        let model: any Embedder
        init(_ model: any Embedder) { self.model = model }
        var info: WorkerInfo { model.info }
        func embedTexts(_ texts: [String]) throws -> [[Float]] { try model.embedTexts(texts) }
        func embedImages(_ paths: [String], budget: Int) throws -> [Embedding] {
            try model.embedImages(paths, budget: budget)
        }
        func embedAudio(_ paths: [String]) throws -> [Embedding] { try model.embedAudio(paths) }
        func close() {}
    }
}

/// One JSON object per line on stdout, written straight to the file descriptor (print() would buffer in a pipe).
/// The app may be gone by now (it quit while this helper lingered): a closed pipe is an error to ignore here, not the
/// exception that `write(_:)` raises, which used to crash the helper on its way out.
func emit(_ fields: [String: Any]) {
    guard let data = try? JSONSerialization.data(withJSONObject: fields, options: [.sortedKeys]) else { return }
    // Node's readline also splits Unicode paragraph separators; JSON strings must preserve them as escapes.
    let line = String(decoding: data, as: UTF8.self)
        .replacingOccurrences(of: "\u{2028}", with: "\\u2028")
        .replacingOccurrences(of: "\u{2029}", with: "\\u2029")
    try? FileHandle.standardOutput.write(contentsOf: Data((line + "\n").utf8))
}
