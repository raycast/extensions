// Opening a result in its app: a PDF with a word to search for, a recording at the moment that matched. DigUp:
// Moments.swift (Opener).
import AppKit
import Foundation
import PDFKit

enum Opener {
    static let quickTime = "com.apple.QuickTimePlayerX"
    static let iina = "com.colliderli.iina"

    /// A PDF opens in its app with a word from its page in the app's search (Preview fills its search and lists the
    /// matches by page; it doesn't go to the first one by itself). Page 1, or a page with none of the words: plain.
    static func openPdf(_ a: Args) throws -> JSON {
        let url = URL(fileURLWithPath: try a.string("path"))
        let page = try a.int("page")
        guard page > 1, let app = NSWorkspace.shared.urlForApplication(toOpen: url),
              let found = landmark(in: url, page: page, words: a.strings("words"))
        else { return plain(url, nil) }
        log("open: \(url.lastPathComponent) in \(app.deletingPathExtension().lastPathComponent), searching “\(found)”")
        // The event alone, as the app's first event: given the file as well, NSWorkspace sends its own event, without
        // the search.
        let configuration = NSWorkspace.OpenConfiguration()
        configuration.appleEvent = openEvent(url, searching: found)
        guard launch(app, configuration) else { return plain(url, nil) }
        return ["how": "search"]
    }

    /// The PDF's own text, as the app will search it (not the index's, which may come from OCR).
    private static func landmark(in url: URL, page: Int, words: [String]) -> String? {
        guard let document = PDFDocument(url: url), document.pageCount >= page else { return nil }
        let texts = (0..<page).map { document.page(at: $0)?.string ?? "" }
        return Landmark.find(page: page, texts: texts, words: words)
    }

    /// The Open Documents event, with the text to search for in them (keyAESearchText).
    static func openEvent(_ url: URL, searching text: String) -> NSAppleEventDescriptor {
        let event = NSAppleEventDescriptor(eventClass: AEEventClass(kCoreEventClass),
                                           eventID: AEEventID(kAEOpenDocuments), targetDescriptor: nil,
                                           returnID: AEReturnID(kAutoGenerateReturnID),
                                           transactionID: AETransactionID(kAnyTransactionID))
        let files = NSAppleEventDescriptor.list()
        files.insert(NSAppleEventDescriptor(fileURL: url), at: 0)
        event.setParam(files, forKeyword: keyDirectObject)
        event.setParam(NSAppleEventDescriptor(string: text), forKeyword: AEKeyword(keyAESearchText))
        return event
    }

    /// `landmarkTest`: DigUp's own test of Landmark.find (SearchTextTests.swift) runs through the helper.
    static func landmarkTest(_ a: Args) throws -> JSON {
        .object(["word": .optional(Landmark.find(page: try a.int("page"), texts: a.strings("texts"), words: a.strings("words")))])
    }

    // MARK: Recordings

    /// A recording opens at its moment in QuickTime Player (asked to go there) or IINA (its URL takes a start time) —
    /// the app named by `player`, else the file's own. Anything else, a moment before the first second, or a failure:
    /// plainly.
    static func openMedia(_ a: Args) throws -> JSON {
        let url = URL(fileURLWithPath: try a.string("path"))
        let seconds = try a.double("seconds")
        guard seconds.isFinite, abs(seconds) < 1e9 else { throw HelperFailure("'seconds' must be a number of seconds") }
        let chosen = a.optString("player").flatMap { NSWorkspace.shared.urlForApplication(withBundleIdentifier: $0) }
        let app = chosen ?? (a.optString("player") == nil ? NSWorkspace.shared.urlForApplication(toOpen: url) : nil)
        let appID = app.flatMap { Bundle(url: $0)?.bundleIdentifier }
        guard seconds >= 1 else { return plain(url, chosen) }
        if appID == iina, let link = iinaLink(url, at: seconds), NSWorkspace.shared.open(link) {
            log("open: \(url.lastPathComponent) at \(seconds) s in IINA")
            return ["how": "moment"]
        }
        if appID == quickTime { return openInQuickTime(url, at: seconds, app: chosen) }
        return plain(url, chosen)
    }

    static func iinaLink(_ url: URL, at seconds: Double) -> URL? {
        var components = URLComponents(string: "iina://open")
        components?.queryItems = [URLQueryItem(name: "url", value: url.absoluteString),
                                  URLQueryItem(name: "mpv_start", value: String(format: "%.1f", seconds))]
        return components?.url
    }

    private final class Outcome: @unchecked Sendable {
        private let lock = NSLock()
        private var value: Int32?
        func set(_ status: Int32) { lock.lock(); value = status; lock.unlock() }
        func get() -> Int32? { lock.lock(); defer { lock.unlock() }; return value }
    }

    /// osascript rather than NSAppleScript: macOS's "control QuickTime Player?" question would otherwise block this
    /// process until it's answered. The time goes over as whole milliseconds (a decimal point depends on locale).
    private static func openInQuickTime(_ url: URL, at seconds: Double, app: URL?) -> JSON {
        let script = """
            on run argv
                set theFile to POSIX file (item 1 of argv)
                set theTime to (item 2 of argv as integer) / 1000
                tell application "QuickTime Player"
                    activate
                    set theDocument to open theFile
                    set current time of theDocument to theTime
                    try
                        set miniaturized of (first window whose document is theDocument) to false
                    end try
                    play theDocument
                    return current time of theDocument
                end tell
            end run
            """
        let process = Process()
        process.executableURL = URL(fileURLWithPath: "/usr/bin/osascript")
        process.arguments = ["-e", script, url.path, String(Int(seconds * 1000))]
        process.standardOutput = FileHandle.nullDevice
        let errors = Pipe()
        process.standardError = errors
        let outcome = Outcome()
        let finished = DispatchSemaphore(value: 0)
        process.terminationHandler = { process in
            outcome.set(process.terminationStatus)
            if process.terminationStatus != 0 {
                let message = String(data: errors.fileHandleForReading.readDataToEndOfFile(), encoding: .utf8) ?? ""
                // Not allowed to control it (-1743), no answer to macOS's question (-1712), or any other failure: open
                // it the plain way (a recording that did open just comes forward).
                log("open: QuickTime Player didn't go to the moment (\(message.trimmingCharacters(in: .whitespacesAndNewlines)))")
                _ = plain(url, app)
            }
            finished.signal()
        }
        do { try process.run() } catch { return plain(url, app) }
        // A quick failure is reported as plain; macOS's question can take as long as the person takes to answer, and
        // the helper must not wait for that.
        if finished.wait(timeout: .now() + 2) == .success, let status = outcome.get(), status != 0 { return ["how": "plain"] }
        return ["how": "moment"]
    }

    // MARK: Plain open

    private final class LaunchBox: @unchecked Sendable {
        var succeeded = false
    }

    /// Opens an app with a configuration and waits for it to launch.
    private static func launch(_ app: URL, _ configuration: NSWorkspace.OpenConfiguration) -> Bool {
        let box = LaunchBox()
        let done = DispatchSemaphore(value: 0)
        NSWorkspace.shared.openApplication(at: app, configuration: configuration) { _, error in
            box.succeeded = error == nil
            if let error { log("open: \(error.localizedDescription)") }
            done.signal()
        }
        return done.wait(timeout: .now() + 15) == .success && box.succeeded
    }

    /// Opens the file in `app` (the player or editor chosen for it), else in its default app.
    private static func plain(_ url: URL, _ app: URL?) -> JSON {
        if let app {
            let box = LaunchBox()
            let done = DispatchSemaphore(value: 0)
            NSWorkspace.shared.open([url], withApplicationAt: app, configuration: NSWorkspace.OpenConfiguration()) { _, error in
                box.succeeded = error == nil
                done.signal()
            }
            if done.wait(timeout: .now() + 15) == .success, box.succeeded { return ["how": "plain"] }
        }
        if !NSWorkspace.shared.open(url) { log("open: macOS couldn't open \(url.lastPathComponent)") }
        return ["how": "plain"]
    }
}
