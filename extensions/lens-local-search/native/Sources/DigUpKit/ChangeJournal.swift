import Foundation
#if os(macOS)
import CoreServices
#endif

/// Replay the OS journal at each scheduled pass; no resident watcher or embedding model is needed.
public enum ChangeJournal {
    public struct Batch { public let cursor: UInt64; public let directories: [URL]; public let full: Bool }
    public static var current: UInt64 {
        #if os(macOS)
        FSEventsGetCurrentEventId()
        #else
        0
        #endif
    }

    public static func collect(roots: [URL], since: UInt64?) -> Batch {
        let roots = roots.map { URL(fileURLWithPath: FolderSelection.realPath($0.path)) }
        let cursor = current  // Events during the crawl must be replayed next time.
        guard let since, since > 0, since <= cursor else { return Batch(cursor: cursor, directories: roots, full: true) }
        #if os(macOS)
        final class Replay: @unchecked Sendable {
            let done = DispatchSemaphore(value: 0)
            var paths = Set<String>()
            var full = false
        }
        let replay = Replay()
        var context = FSEventStreamContext(version: 0, info: Unmanaged.passUnretained(replay).toOpaque(), retain: nil, release: nil, copyDescription: nil)
        let callback: FSEventStreamCallback = { _, info, count, raw, flags, _ in
            let state = Unmanaged<Replay>.fromOpaque(info!).takeUnretainedValue()
            let paths = unsafeBitCast(raw, to: NSArray.self) as! [String]
            for i in 0..<count {
                if flags[i] & UInt32(kFSEventStreamEventFlagHistoryDone) != 0 { state.done.signal(); continue }
                if flags[i] & UInt32(kFSEventStreamEventFlagMustScanSubDirs | kFSEventStreamEventFlagUserDropped | kFSEventStreamEventFlagKernelDropped | kFSEventStreamEventFlagEventIdsWrapped | kFSEventStreamEventFlagRootChanged | kFSEventStreamEventFlagMount | kFSEventStreamEventFlagUnmount) != 0 { state.full = true }
                let path = flags[i] & UInt32(kFSEventStreamEventFlagItemIsDir) != 0 ? paths[i] : (paths[i] as NSString).deletingLastPathComponent
                state.paths.insert(path)
            }
        }
        guard let stream = FSEventStreamCreate(nil, callback, &context, roots.map(\.path) as CFArray, since, 0.01,
            UInt32(kFSEventStreamCreateFlagUseCFTypes | kFSEventStreamCreateFlagFileEvents | kFSEventStreamCreateFlagWatchRoot)) else {
            return Batch(cursor: cursor, directories: roots, full: true)
        }
        let queue = DispatchQueue(label: "Lens.change-journal", qos: .utility)
        FSEventStreamSetDispatchQueue(stream, queue)
        defer { FSEventStreamStop(stream); FSEventStreamInvalidate(stream); queue.sync {}; FSEventStreamRelease(stream) }
        guard FSEventStreamStart(stream) else { return Batch(cursor: cursor, directories: roots, full: true) }
        FSEventStreamFlushSync(stream)
        let completed = replay.done.wait(timeout: .now() + 3) == .success
        return queue.sync {
            guard completed, !replay.full else { return Batch(cursor: cursor, directories: roots, full: true) }
            var dirs = Set<String>()
            for eventPath in replay.paths {
                var p = eventPath
                // Deleted/renamed directories are reconciled from the nearest surviving parent.
                while !FileManager.default.fileExists(atPath: p), p.count > 1 { p = (p as NSString).deletingLastPathComponent }
                guard roots.contains(where: { p == $0.path || FolderSelection.isInside(p, $0.path) }) else { continue }
                dirs.insert(p)
            }
            let kept = dirs.filter { p in !dirs.contains(where: { $0 != p && FolderSelection.isInside(p, $0) }) }
            return Batch(cursor: cursor, directories: kept.sorted().map { URL(fileURLWithPath: $0) }, full: false)
        }
        #else
        return Batch(cursor: cursor, directories: roots, full: true)
        #endif
    }
}
