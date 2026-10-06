import CryptoKit
import Foundation

// Native client for Microsoft Edge's "Read Aloud" voices (the same free service the Edge
// browser uses). Protocol follows the open-source edge-tts project.

enum EdgeTTSError: LocalizedError {
    case noAudio
    case unexpected(String)
    case timedOut

    var errorDescription: String? {
        switch self {
        case .noAudio: return "The voice service returned no audio"
        case let .unexpected(s): return "Unexpected response from the voice service: \(s)"
        case .timedOut: return "The voice service took too long to respond"
        }
    }
}

struct Boundary {
    let start: Double
    let end: Double
    let text: String
}

enum EdgeTTS {
    private static let trustedClientToken = "6A5AA1D4EAFF4E9FB37E23D68491D6F4"
    private static let chromiumFullVersion = "143.0.3650.75"
    private static var chromiumMajor: String { String(chromiumFullVersion.split(separator: ".")[0]) }
    private static let endpoint = "wss://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1"
    private static let timeout: UInt64 = 30

    private static let lock = NSLock()
    private static var _clockSkew: Double = 0
    private static var clockSkew: Double {
        get { lock.lock(); defer { lock.unlock() }; return _clockSkew }
        set { lock.lock(); _clockSkew = newValue; lock.unlock() }
    }

    private static let session: URLSession = {
        let config = URLSessionConfiguration.ephemeral
        config.httpShouldSetCookies = false
        config.requestCachePolicy = .reloadIgnoringLocalCacheData
        return URLSession(configuration: config)
    }()

    /// Time-based token the service requires (SHA-256 of Windows file time rounded to 5 minutes + client token).
    private static func secMsGec() -> String {
        var ticks = Date().timeIntervalSince1970 + clockSkew
        ticks += 11_644_473_600
        ticks -= ticks.truncatingRemainder(dividingBy: 300)
        ticks *= 10_000_000
        let input = String(format: "%.0f", ticks) + trustedClientToken
        return SHA256.hash(data: Data(input.utf8)).map { String(format: "%02X", $0) }.joined()
    }

    private static func randomHex(_ bytes: Int) -> String {
        (0..<bytes).map { _ in String(format: "%02X", UInt8.random(in: 0...255)) }.joined()
    }

    private static func connectionId() -> String {
        UUID().uuidString.replacingOccurrences(of: "-", with: "").lowercased()
    }

    private static let dateFormatter: DateFormatter = {
        let f = DateFormatter()
        f.locale = Locale(identifier: "en_US_POSIX")
        f.timeZone = TimeZone(identifier: "UTC")
        f.dateFormat = "EEE MMM dd yyyy HH:mm:ss 'GMT+0000 (Coordinated Universal Time)'"
        return f
    }()

    private static let httpDateFormatter: DateFormatter = {
        let f = DateFormatter()
        f.locale = Locale(identifier: "en_US_POSIX")
        f.timeZone = TimeZone(identifier: "GMT")
        f.dateFormat = "EEE, dd MMM yyyy HH:mm:ss zzz"
        return f
    }()

    private static func timestamp() -> String { dateFormatter.string(from: Date()) }

    private static func escapeXML(_ s: String) -> String {
        s.replacingOccurrences(of: "&", with: "&amp;")
            .replacingOccurrences(of: "<", with: "&lt;")
            .replacingOccurrences(of: ">", with: "&gt;")
    }

    private static func unescapeXML(_ s: String) -> String {
        s.replacingOccurrences(of: "&lt;", with: "<")
            .replacingOccurrences(of: "&gt;", with: ">")
            .replacingOccurrences(of: "&quot;", with: "\"")
            .replacingOccurrences(of: "&apos;", with: "'")
            .replacingOccurrences(of: "&amp;", with: "&")
    }

    /// The service rejects a few control characters (e.g. vertical tab from OCR'd PDFs).
    private static func removeIncompatible(_ s: String) -> String {
        String(String.UnicodeScalarView(s.unicodeScalars.map { u in
            let v = u.value
            return (v <= 8 || v == 11 || v == 12 || (14...31).contains(v)) ? " " : u
        }))
    }

    private static func headers(_ text: String) -> [String: String] {
        var out: [String: String] = [:]
        for line in text.components(separatedBy: "\r\n") {
            guard let colon = line.firstIndex(of: ":") else { continue }
            out[String(line[..<colon])] = String(line[line.index(after: colon)...])
        }
        return out
    }

    /// Synthesises `text` and returns MP3 audio plus word timings.
    static func synthesize(_ text: String, voice: String, rate: String) async throws -> (Data, [Boundary]) {
        var comps = URLComponents(string: endpoint)!
        comps.queryItems = [
            URLQueryItem(name: "TrustedClientToken", value: trustedClientToken),
            URLQueryItem(name: "ConnectionId", value: connectionId()),
            URLQueryItem(name: "Sec-MS-GEC", value: secMsGec()),
            URLQueryItem(name: "Sec-MS-GEC-Version", value: "1-\(chromiumFullVersion)"),
        ]
        var request = URLRequest(url: comps.url!)
        request.httpShouldHandleCookies = false
        request.setValue("no-cache", forHTTPHeaderField: "Pragma")
        request.setValue("no-cache", forHTTPHeaderField: "Cache-Control")
        request.setValue("chrome-extension://jdiccldimpdaibmpdkjnbmckianbfold", forHTTPHeaderField: "Origin")
        request.setValue(
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) "
                + "Chrome/\(chromiumMajor).0.0.0 Safari/537.36 Edg/\(chromiumMajor).0.0.0",
            forHTTPHeaderField: "User-Agent")
        request.setValue("en-US,en;q=0.9", forHTTPHeaderField: "Accept-Language")
        request.setValue("muid=\(randomHex(16));", forHTTPHeaderField: "Cookie")

        let socket = session.webSocketTask(with: request)
        socket.maximumMessageSize = 16 * 1024 * 1024
        socket.resume()

        let watchdog = Task {
            try? await Task.sleep(nanoseconds: timeout * 1_000_000_000)
            if !Task.isCancelled { socket.cancel(with: .goingAway, reason: nil) }
        }
        defer {
            watchdog.cancel()
            socket.cancel(with: .normalClosure, reason: nil)
        }

        return try await withTaskCancellationHandler {
            do {
                return try await run(socket, text: text, voice: voice, rate: rate)
            } catch {
                adjustClockSkew(from: socket.response)
                throw error
            }
        } onCancel: {
            socket.cancel(with: .goingAway, reason: nil)
        }
    }

    /// If the service rejected us because the Mac's clock is off, learn the offset from its Date header.
    private static func adjustClockSkew(from response: URLResponse?) {
        guard let http = response as? HTTPURLResponse, http.statusCode == 403,
              let date = http.value(forHTTPHeaderField: "Date"),
              let server = httpDateFormatter.date(from: date) else { return }
        clockSkew += server.timeIntervalSince1970 - (Date().timeIntervalSince1970 + clockSkew)
    }

    private static func run(_ socket: URLSessionWebSocketTask, text: String, voice: String, rate: String) async throws -> (Data, [Boundary]) {
        let config = "X-Timestamp:\(timestamp())\r\n"
            + "Content-Type:application/json; charset=utf-8\r\n"
            + "Path:speech.config\r\n\r\n"
            + #"{"context":{"synthesis":{"audio":{"metadataoptions":{"#
            + #""sentenceBoundaryEnabled":"false","wordBoundaryEnabled":"true"},"#
            + #""outputFormat":"audio-24khz-48kbitrate-mono-mp3"}}}}"#
            + "\r\n"
        try await socket.send(.string(config))

        let ssml = "<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='en-US'>"
            + "<voice name='\(voice)'><prosody pitch='+0Hz' rate='\(rate)' volume='+0%'>"
            + escapeXML(removeIncompatible(text))
            + "</prosody></voice></speak>"
        let request = "X-RequestId:\(connectionId())\r\n"
            + "Content-Type:application/ssml+xml\r\n"
            + "X-Timestamp:\(timestamp())Z\r\n" // trailing Z matches Edge's own (buggy) format
            + "Path:ssml\r\n\r\n"
            + ssml
        try await socket.send(.string(request))

        var audio = Data()
        var bounds: [Boundary] = []
        receiving: while true {
            try Task.checkCancellation()
            switch try await socket.receive() {
            case let .string(message):
                guard let split = message.range(of: "\r\n\r\n") else { continue }
                let head = headers(String(message[..<split.lowerBound]))
                let body = String(message[split.upperBound...])
                switch head["Path"] {
                case "audio.metadata":
                    guard let json = try? JSONSerialization.jsonObject(with: Data(body.utf8)) as? [String: Any],
                          let items = json["Metadata"] as? [[String: Any]] else { continue }
                    for item in items where item["Type"] as? String == "WordBoundary" {
                        guard let data = item["Data"] as? [String: Any],
                              let offset = (data["Offset"] as? NSNumber)?.doubleValue,
                              let duration = (data["Duration"] as? NSNumber)?.doubleValue,
                              let word = (data["text"] as? [String: Any])?["Text"] as? String else { continue }
                        bounds.append(Boundary(start: offset / 1e7, end: (offset + duration) / 1e7, text: unescapeXML(word)))
                    }
                case "turn.end":
                    break receiving
                default:
                    continue // turn.start, response
                }
            case let .data(frame):
                guard frame.count >= 2 else { throw EdgeTTSError.unexpected("short audio frame") }
                let headerLength = Int(frame[frame.startIndex]) << 8 | Int(frame[frame.startIndex + 1])
                guard 2 + headerLength <= frame.count else { throw EdgeTTSError.unexpected("bad audio header") }
                let headerData = frame.subdata(in: (frame.startIndex + 2)..<(frame.startIndex + 2 + headerLength))
                let head = headers(String(decoding: headerData, as: UTF8.self))
                guard head["Path"] == "audio" else { throw EdgeTTSError.unexpected("binary message is not audio") }
                let payload = frame.subdata(in: (frame.startIndex + 2 + headerLength)..<frame.endIndex)
                if head["Content-Type"] == nil && payload.isEmpty { continue }
                audio.append(payload)
            @unknown default:
                continue
            }
        }
        if audio.isEmpty { throw EdgeTTSError.noAudio }
        return (audio, bounds)
    }
}

// MARK: - Chunked generation
//
// Groups the speech units into chunks (a short first one so playback starts fast), synthesises
// up to `kParallel` at once and writes, per chunk:
//   chunk-NNN.mp3   audio
//   chunk-NNN.json  {"start": u16, "end": u16, "words": [[start_s, end_s, loc_u16, len_u16], ...]}
// then "done" (or "error"). The reader polls these files, so playback can start while later
// chunks are still being made. Offsets are UTF-16 positions in the display text.

private let kLimits = [90, 160, 300, 550, 900]
private let kMaxChunk = 1200
private let kParallel = 3

private struct Piece {
    let offset: Int  // in the chunk's speech text
    let length: Int
    let disp: Int
    let exact: Bool
}

final class SpeechGenerator: @unchecked Sendable {
    let units: [SpeechUnit]
    let voice: String
    let rate: String
    let outDir: URL
    let startLoc: Int
    private var task: Task<Void, Never>?

    init(units: [SpeechUnit], voice: String, rate: String, outDir: URL, from startLoc: Int) {
        self.units = units
        self.voice = voice
        self.rate = rate
        self.outDir = outDir
        self.startLoc = startLoc
    }

    func start() {
        task = Task.detached(priority: .userInitiated) { [self] in await self.run() }
    }

    func cancel() { task?.cancel() }

    private func planChunks() -> [[SpeechUnit]] {
        var chunks: [[SpeechUnit]] = []
        var cur: [SpeechUnit] = []
        var size = 0
        for u in units where u.end > startLoc {
            let length = u.pieces.reduce(0) { $0 + $1.text.utf16.count }
            let limit = chunks.count < kLimits.count ? kLimits[chunks.count] : kMaxChunk
            if !cur.isEmpty && size + length > limit {
                chunks.append(cur)
                cur = []
                size = 0
            }
            cur.append(u)
            size += length + 1
        }
        if !cur.isEmpty { chunks.append(cur) }
        return chunks
    }

    private func assemble(_ group: [SpeechUnit]) -> (String, [Piece]) {
        var text = ""
        var pieces: [Piece] = []
        var prev: Int?
        for u in group {
            if let p = prev { text += u.block == p ? " " : "\n" }
            for piece in u.pieces {
                let len = piece.text.utf16.count
                pieces.append(Piece(offset: text.utf16.count, length: len, disp: piece.disp, exact: piece.exact))
                text += piece.text
            }
            prev = u.block
        }
        return (text, pieces)
    }

    /// Maps the service's word timings back to positions in the display text.
    private func mapWords(_ bounds: [Boundary], _ speech: String, _ pieces: [Piece]) -> [[Double]] {
        let ns = speech as NSString
        var words: [[Double]] = []
        var cursor = 0
        for b in bounds {
            let wlen = b.text.utf16.count
            guard wlen > 0, cursor <= ns.length else { continue }
            let range = NSRange(location: cursor, length: ns.length - cursor)
            var found = ns.range(of: b.text, options: [], range: range)
            if found.location == NSNotFound { found = ns.range(of: b.text, options: [.caseInsensitive], range: range) }
            let idx = found.location
            if idx == NSNotFound || idx - cursor > 200 { continue }
            // Last piece starting at or before idx.
            var k = 0
            for (j, p) in pieces.enumerated() where p.offset <= idx { k = j }
            let p = pieces[k]
            let loc: Int
            let end: Int
            if p.exact && idx - p.offset < p.length {
                loc = p.disp + (idx - p.offset)
                end = p.disp + min(idx - p.offset + wlen, p.length)
            } else {
                loc = p.disp + (p.exact ? p.length : 0)
                end = loc
            }
            words.append([(b.start * 1000).rounded() / 1000, (b.end * 1000).rounded() / 1000, Double(loc), Double(end - loc)])
            cursor = idx + found.length
        }
        return words
    }

    private func make(_ n: Int, _ group: [SpeechUnit]) async throws {
        let (speech, pieces) = assemble(group)
        var result: (Data, [Boundary])?
        for attempt in 0..<3 {
            try Task.checkCancellation()
            do {
                result = try await EdgeTTS.synthesize(speech, voice: voice, rate: rate)
                break
            } catch {
                if Task.isCancelled || attempt == 2 { throw error }
                try await Task.sleep(nanoseconds: UInt64(600_000_000 * (attempt + 1))) // network hiccup: retry
            }
        }
        guard let (audio, bounds) = result else { throw EdgeTTSError.noAudio }
        try Task.checkCancellation()
        let base = outDir.appendingPathComponent(String(format: "chunk-%03d", n))
        try audio.write(to: base.appendingPathExtension("mp3"), options: .atomic)
        let meta: [String: Any] = [
            "start": group[0].start,
            "end": group[group.count - 1].end,
            "words": mapWords(bounds, speech, pieces),
        ]
        let json = try JSONSerialization.data(withJSONObject: meta)
        try json.write(to: base.appendingPathExtension("json"), options: .atomic)
    }

    private func run() async {
        let chunks = planChunks()
        do {
            try await withThrowingTaskGroup(of: Void.self) { group in
                for (n, chunk) in chunks.enumerated() {
                    if n >= kParallel { try await group.next() }
                    group.addTask { try await self.make(n, chunk) }
                }
                try await group.waitForAll()
            }
            if Task.isCancelled { return }
            try? Data("ok".utf8).write(to: outDir.appendingPathComponent("done"), options: .atomic)
        } catch {
            if Task.isCancelled { return }
            try? Data(error.localizedDescription.utf8).write(to: outDir.appendingPathComponent("error"), options: .atomic)
        }
    }
}
