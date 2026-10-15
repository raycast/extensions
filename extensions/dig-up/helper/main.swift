// digup-helper: the macOS readers of DigUp (ImageIO, Vision, PDFKit, AVFoundation, the Cocoa text system) behind a
// JSON-lines pipe. `digup-helper serve [--memory-limit BYTES] [--mtmd LIBMTMD]` reads one request per line on stdin and
// answers one line each on stdout, in order, one at a time. Logs go to stderr. Protocol: docs/DESIGN.md ("Swift helper
// protocol").
import Darwin
import Foundation

let helperVersion = "1.0.0"

typealias Handler = (Args) throws -> JSON

let handlers: [String: Handler] = [
    "ping": { _ in ["version": .string(helperVersion)] },
    "power": { _ in Power.status() },
    "walk": { try Walk.run($0) },
    "image": { try ImageOps.image($0) },
    "size": { try ImageOps.size($0) },
    "pdf": { try PDFOps.read($0) },
    "rich": { try RichText.read($0) },
    "audio": { try AudioOps.windows($0) },
    "video": { try VideoOps.keyframes($0) },
    "thumb": { try Thumbs.make($0) },
    "openPdf": { try Opener.openPdf($0) },
    "openMedia": { try Opener.openMedia($0) },
    "pages": { try Estimate.pages($0) },
    "duration": { try Estimate.duration($0) },
    // Test hooks (not part of the product protocol): DigUp's own vectors run through the real code.
    "targetSizeTest": { try ImageOps.targetSizeTest($0) },
    "resizeTest": { try ImageOps.resizeTest($0) },
    "landmarkTest": { try Opener.landmarkTest($0) },
    "pageProblemTest": { try PDFOps.pageProblemTest($0) },
    "pixelsTest": { try ImageOps.pixelsTest($0) },
    "decoderTest": { _ in ["stb": .bool(ModelDecoder.loaded)] },
    "toolTest": { ["path": .optional(FFmpeg.tool(try $0.string("name")))] },
    // A child that outlives the request unless the client ends it: /bin/sleep run the way ffmpeg is.
    "childTest": { try FFmpeg.run("/bin/sleep", [String(try $0.positiveDouble("seconds"))]) { _ in }; return [:] },
]

func describe(_ error: Error) -> String {
    let text: String
    switch error {
    case let failure as HelperFailure: text = failure.message
    case let extract as ExtractError: text = extract.description
    case let tool as ToolFailure: text = ExtractError.unreadable(tool.description).description
    case let unavailable as MediaUnavailable: text = ExtractError.unreadable(unavailable.reason).description
    default: text = (error as NSError).localizedDescription
    }
    return text.count > 400 ? String(text.prefix(400)) + "…" : text
}

func failure(_ id: Int, _ message: String) -> JSON {
    ["id": .int(id), "ok": false, "error": .string(message)]
}

func respond(to line: String) -> JSON {
    guard let data = line.data(using: .utf8),
          let raw = (try? JSONSerialization.jsonObject(with: data)) as? [String: Any],
          let op = raw["op"] as? String
    else { return failure(0, "bad request") }
    let id = (raw["id"] as? NSNumber)?.intValue ?? 0
    guard let handler = handlers[op] else { return failure(id, "unknown op '\(op)'") }
    Watchdog.reading = raw["path"] as? String
    defer { Watchdog.reading = nil }
    do {
        guard case .object(var members) = try handler(Args(raw: raw)) else {
            return failure(id, "op '\(op)' returned no object")
        }
        members["id"] = .int(id)
        members["ok"] = true
        return .object(members)
    } catch {
        log("\(op) failed: \(describe(error))")
        return failure(id, describe(error))
    }
}

/// DigUp: Watchdog.swift. Every second, the helper's memory as Activity Monitor counts it (its footprint, which counts
/// compressed and swapped pages that RSS leaves out). Past the limit it ends its children and exits with 75; the client
/// fails the request and starts a new helper. The time limit is the client's.
enum Watchdog {
    static let exitCode: Int32 = 75   // DigUp: StoppedFile.exitCode (EX_TEMPFAIL)

    private static let lock = NSLock()
    private static var path: String?

    /// The file being read, for the log line.
    static var reading: String? {
        get { lock.lock(); defer { lock.unlock() }; return path }
        set { lock.lock(); path = newValue; lock.unlock() }
    }

    static func start(memoryLimit: UInt64) {
        Thread.detachNewThread {
            while true {
                Thread.sleep(forTimeInterval: 1)
                guard let footprint = footprint(), footprint > memoryLimit else { continue }
                log("watchdog: needed more than \(size(memoryLimit)) of memory to read: \(reading ?? "no file being read")")
                Children.killAll()
                _exit(exitCode)
            }
        }
    }

    static func footprint() -> UInt64? {
        var info = task_vm_info_data_t()
        var count = mach_msg_type_number_t(MemoryLayout<task_vm_info_data_t>.size / MemoryLayout<natural_t>.size)
        let result = withUnsafeMutablePointer(to: &info) {
            $0.withMemoryRebound(to: integer_t.self, capacity: Int(count)) {
                task_info(mach_task_self_, task_flavor_t(TASK_VM_INFO), $0, &count)
            }
        }
        return result == KERN_SUCCESS ? info.phys_footprint : nil
    }

    private static func size(_ bytes: UInt64) -> String {
        bytes >= 1 << 30 ? String(format: "%.0f GB", Double(bytes) / Double(1 << 30)) : "\(bytes >> 20) MB"
    }
}

/// `--name value` from the command line.
func option(_ name: String) -> String? {
    let arguments = CommandLine.arguments
    guard let index = arguments.firstIndex(of: name), index + 1 < arguments.count else { return nil }
    return arguments[index + 1]
}

func serve() -> Never {
    ModelDecoder.library = option("--mtmd")
    if let limit = option("--memory-limit").flatMap(UInt64.init) { Watchdog.start(memoryLimit: limit) }
    // Replies go to a private copy of stdout; whatever a framework prints to stdout lands on stderr instead.
    let replies = FileHandle(fileDescriptor: dup(STDOUT_FILENO), closeOnDealloc: false)
    dup2(STDERR_FILENO, STDOUT_FILENO)
    // PDFKit and Vision recurse deeply on some files: the default 512 KB thread stack is not enough.
    let worker = Thread {
        while let line = readLine(strippingNewline: true) {
            guard !line.isEmpty else { continue }
            autoreleasepool {
                var bytes: [UInt8] = []
                respond(to: line).write(into: &bytes)
                bytes.append(0x0A)
                try? replies.write(contentsOf: bytes)
            }
        }
        exit(0)   // stdin closed: the daemon is gone or closed us
    }
    worker.stackSize = 16 << 20
    worker.start()
    // Frameworks deliver some callbacks (Quick Look, NSWorkspace) on the main run loop.
    Timer.scheduledTimer(withTimeInterval: 3600, repeats: true) { _ in }
    RunLoop.main.run()
    exit(0)
}

if CommandLine.arguments.dropFirst().first == "serve" {
    serve()
}
FileHandle.standardError.write(Data("usage: digup-helper serve [--memory-limit BYTES] [--mtmd LIBMTMD]\n".utf8))
exit(2)
