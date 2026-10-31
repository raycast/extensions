import DigUpKit
import Foundation

/// Ends the indexing helper when reading one file runs away. Apple's PDF text extraction has grown without end on a
/// page of some PDFs (30 GB in 3.5 minutes, never returning), and nothing stops code like that from outside but ending
/// the process. Every second the watchdog looks at the helper's memory (its footprint, as Activity Monitor counts it) and
/// at how long the file being read (`Indexer.nowReading`) has taken. Past `memoryLimit`, or past `timeLimit` on one
/// file, it writes down the file and why (`StoppedFile`) and exits with `StoppedFile.exitCode`: the app starts a new
/// helper, which marks that file as one that couldn't be read and goes on.
final class Watchdog: @unchecked Sendable {
    let memoryLimit: UInt64
    let timeLimit: TimeInterval
    let note: URL

    /// Half the Mac's memory, but at least 4 GB and at most 8 GB: indexing peaks at 1–3 GB on the biggest files.
    static var defaultMemoryLimit: UInt64 {
        min(8 << 30, max(4 << 30, ProcessInfo.processInfo.physicalMemory / 2))
    }

    /// Reading one file never takes this long: an hour of 4K video is minutes, a long book is read 30 pages a step.
    static let defaultTimeLimit: TimeInterval = 15 * 60

    init(folder: URL, memoryLimit: UInt64 = Watchdog.defaultMemoryLimit,
         timeLimit: TimeInterval = Watchdog.defaultTimeLimit) {
        self.memoryLimit = memoryLimit
        self.timeLimit = timeLimit
        note = StoppedFile.location(in: folder)
    }

    func start() {
        Thread.detachNewThread { [self] in
            while true {
                Thread.sleep(forTimeInterval: 1)
                let reading = Indexer.nowReading
                if let footprint = Self.footprint(), footprint > memoryLimit {
                    stop(reading?.path, why: "needed more than \(Self.size(memoryLimit)) of memory to read")
                }
                if let reading, Date().timeIntervalSince(reading.since) > timeLimit {
                    let limit = timeLimit >= 120 ? "\(Int(timeLimit / 60)) minutes" : "\(Int(timeLimit)) seconds"
                    stop(reading.path, why: "took more than \(limit) to read")
                }
            }
        }
    }

    private func stop(_ path: String?, why: String) -> Never {
        StoppedFile(path: path, why: why).write(to: note)
        emit(["event": "error", "message": "watchdog: \(why): \(path ?? "no file being read")"])
        FileHandle.standardError.write(Data("watchdog: \(why): \(path ?? "no file being read")\n".utf8))
        #if os(Windows)
        exit(StoppedFile.exitCode)
        #else
        _exit(StoppedFile.exitCode)
        #endif
    }

    private static func size(_ bytes: UInt64) -> String {
        bytes >= 1 << 30 ? String(format: "%.0f GB", Double(bytes) / Double(1 << 30)) : "\(bytes >> 20) MB"
    }

    /// This process's memory as Activity Monitor counts it: its footprint on a Mac, resident memory on Linux.
    static func footprint() -> UInt64? {
        #if canImport(Darwin)
        var info = task_vm_info_data_t()
        var count = mach_msg_type_number_t(MemoryLayout<task_vm_info_data_t>.size / MemoryLayout<natural_t>.size)
        let result = withUnsafeMutablePointer(to: &info) {
            $0.withMemoryRebound(to: integer_t.self, capacity: Int(count)) {
                task_info(mach_task_self_, task_flavor_t(TASK_VM_INFO), $0, &count)
            }
        }
        return result == KERN_SUCCESS ? info.phys_footprint : nil
        #elseif os(Linux)
        guard let statm = try? String(contentsOfFile: "/proc/self/statm", encoding: .utf8),
              let pages = statm.split(separator: " ").dropFirst().first.flatMap({ UInt64($0) }) else { return nil }
        return pages * UInt64(getpagesize())
        #else
        return nil
        #endif
    }
}

/// The file a helper stopped on (`Watchdog`), written beside the index for the next helper.
struct StoppedFile: Codable {
    /// The exit status that says "a file was stopped: start a new helper" (EX_TEMPFAIL).
    static let exitCode: Int32 = 75

    let path: String?
    let why: String

    static func location(in folder: URL) -> URL {
        folder.appendingPathComponent("stopped-file.json")
    }

    func write(to url: URL) {
        try? JSONEncoder().encode(self).write(to: url, options: .atomic)
    }

    /// The note an earlier helper left, removed as it's read.
    static func take(from folder: URL) -> StoppedFile? {
        let url = location(in: folder)
        guard let data = try? Data(contentsOf: url) else { return nil }
        try? FileManager.default.removeItem(at: url)
        return try? JSONDecoder().decode(StoppedFile.self, from: data)
    }
}
