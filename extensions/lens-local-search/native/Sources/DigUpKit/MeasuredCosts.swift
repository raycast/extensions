import Foundation

/// What indexing costs on this Mac, from the indexing itself: seconds and units (pictures, PDF pages, document chunks,
/// seconds of audio or video, stretches of code) summed kind by kind as jobs finish, in `costs.json` beside the index.
/// Estimates use a kind's measured cost once it has enough of them. Until then, `Costs`' fixed numbers, measured on an
/// M4 Pro, stand in, scaled by `speed` (how this Mac compares, from a second of work that needs no model).
public struct MeasuredCosts: Codable, Sendable, Equatable {
    public struct Tally: Codable, Sendable, Equatable {
        public var seconds = 0.0
        public var units = 0.0

        public init(seconds: Double = 0, units: Double = 0) {
            self.seconds = seconds
            self.units = units
        }
    }

    /// How this Mac compares to the M4 Pro behind `Costs`: 1 is as fast, 2 takes twice as long. `embedding` for the
    /// model's work (matrix multiplies on the GPU), `ocr` for Vision's text recognition.
    public struct Speed: Codable, Sendable, Equatable {
        public var embedding: Double
        public var ocr: Double

        public init(embedding: Double, ocr: Double) {
            self.embedding = embedding
            self.ocr = ocr
        }
    }

    /// By the name of the `Costs` field they measure ("image", "pdfPage", …).
    public var tallies: [String: Tally] = [:]
    public var speed: Speed?

    public init() {}

    /// Units a kind needs before its measured cost is trusted: a few dozen files, or minutes of media.
    static let enough: [String: Double] = [
        "image": 20, "screenshot": 20, "pdfPage": 30, "docChunk": 30, "audioSecond": 600, "videoSecond": 600,
        "codeStretch": 100,
    ]

    /// A job that took `seconds` for `units` of `name`. Recent work counts most: past ten times what's enough, what
    /// came before is halved.
    public mutating func add(_ name: String, units: Double, seconds: Double) {
        guard units > 0, seconds > 0 else { return }
        var tally = tallies[name, default: Tally()]
        if tally.units > 10 * (Self.enough[name] ?? 20) {
            tally.seconds /= 2
            tally.units /= 2
        }
        tally.seconds += seconds
        tally.units += units
        tallies[name] = tally
    }

    /// The costs to estimate with: measured ones where there are enough, else the fixed ones as fast as `speed` says.
    public var costs: Costs {
        var costs = Costs()
        if let speed {
            let embedding = min(10, max(0.25, speed.embedding)), ocr = min(10, max(0.25, speed.ocr))
            costs.image *= embedding
            costs.screenshot *= max(embedding, ocr)   // OCR runs beside the model and usually sets the pace
            costs.pdfPage *= embedding
            costs.docChunk *= embedding
            costs.audioSecond *= embedding
            costs.videoSecond *= embedding
            costs.codeStretch *= embedding
        }
        func measured(_ name: String) -> Double? {
            guard let tally = tallies[name], tally.units >= Self.enough[name] ?? .infinity else { return nil }
            return tally.seconds / tally.units
        }
        costs.image = measured("image") ?? costs.image
        costs.screenshot = measured("screenshot") ?? costs.screenshot
        costs.pdfPage = measured("pdfPage") ?? costs.pdfPage
        costs.docChunk = measured("docChunk") ?? costs.docChunk
        costs.audioSecond = measured("audioSecond") ?? costs.audioSecond
        costs.videoSecond = measured("videoSecond") ?? costs.videoSecond
        costs.codeStretch = measured("codeStretch") ?? costs.codeStretch
        return costs
    }

    public static func file(in folder: URL) -> URL {
        folder.appendingPathComponent("costs.json")
    }

    /// What's saved in `folder`, or nothing measured yet.
    public static func load(from folder: URL) -> MeasuredCosts {
        (try? Data(contentsOf: file(in: folder))).flatMap { try? JSONDecoder().decode(MeasuredCosts.self, from: $0) }
            ?? MeasuredCosts()
    }

    public func save(to folder: URL) {
        try? FileManager.default.createDirectory(at: folder, withIntermediateDirectories: true)
        let encoder = JSONEncoder()
        encoder.outputFormatting = [.prettyPrinted, .sortedKeys]
        try? encoder.encode(self).write(to: Self.file(in: folder), options: .atomic)
    }

    private static let lock = NSLock()

    /// Saves this machine's speed (`Speed.measure`) beside what's measured in `folder`.
    public static func setSpeed(_ speed: Speed, in folder: URL) {
        lock.withLock {
            var saved = load(from: folder)
            saved.speed = speed
            saved.save(to: folder)
        }
    }

    /// Adds `new` to what's saved in `folder` (the main index and the code index each add their own kinds).
    static func merge(_ new: MeasuredCosts, into folder: URL) {
        lock.withLock {
            var saved = load(from: folder)
            for (name, tally) in new.tallies { saved.add(name, units: tally.units, seconds: tally.seconds) }
            saved.save(to: folder)
        }
    }
}
