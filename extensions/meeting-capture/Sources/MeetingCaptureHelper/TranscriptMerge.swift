import Foundation

enum TranscriptLanguageMode: String, CaseIterable, Sendable {
    case vietnamese = "vietnamese"
    case english = "english"
    case bilingual = "vietnamese-english"
    case systemDefault = "system-default"

    static func parse(_ value: String?) -> Self {
        guard let value else { return .systemDefault }
        return Self(rawValue: value.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()) ?? .systemDefault
    }

    var displayName: String {
        switch self {
        case .vietnamese: "Vietnamese"
        case .english: "English"
        case .bilingual: "Vietnamese + English"
        case .systemDefault: "System Default"
        }
    }

    var requestedLocaleIdentifiers: [String] {
        switch self {
        case .vietnamese: ["vi_VN"]
        case .english: ["en_US"]
        case .bilingual: ["vi_VN", "en_US"]
        case .systemDefault: [Locale.current.identifier]
        }
    }
}

enum TranscriberEngine: String, Equatable, Sendable {
    case speechTranscriber
    case dictationTranscriber
}

enum ModelAssetState: String, Equatable, Sendable {
    case unsupported, downloading, supported, installed
}

enum ModelInstallationPlan: Equatable, Sendable {
    case unavailable
    case waitForDownload
    case downloadAndInstall
    case ready
}

func selectTranscriberEngine(speechSupported: Bool, dictationSupported: Bool) -> TranscriberEngine? {
    if speechSupported { return .speechTranscriber }
    if dictationSupported { return .dictationTranscriber }
    return nil
}

func installationPlan(for state: ModelAssetState) -> ModelInstallationPlan {
    switch state {
    case .unsupported: .unavailable
    case .downloading: .waitForDownload
    case .supported: .downloadAndInstall
    case .installed: .ready
    }
}

func modelInstallMessage(language: String, fractionCompleted: Double?) -> String {
    guard let fractionCompleted else { return "Downloading \(language) model…" }
    let percent = Int((min(1, max(0, fractionCompleted)) * 100).rounded())
    return "Downloading \(language) model… \(percent)%"
}

func modelInstallFailureMessage(language: String, reason: String) -> String {
    "Could not install the Apple on-device \(language) model: \(reason). The MP3 is safe; start another short capture to retry after reconnecting or freeing storage."
}

struct TranscriptSegment: Equatable, Sendable {
    let start: Double
    let end: Double
    let text: String
    let localeIdentifier: String
    let confidence: Double?
    let alternatives: [String]

    init(start: Double, end: Double, text: String, localeIdentifier: String, confidence: Double? = nil, alternatives: [String] = []) {
        self.start = start
        self.end = max(start, end)
        self.text = text
        self.localeIdentifier = localeIdentifier
        self.confidence = confidence
        self.alternatives = alternatives
    }
}

private func normalizedTranscriptText(_ text: String) -> String {
    text.folding(options: [.caseInsensitive, .diacriticInsensitive], locale: Locale(identifier: "en_US_POSIX"))
        .unicodeScalars
        .filter { CharacterSet.alphanumerics.contains($0) }
        .map(String.init)
        .joined()
}

private func overlapRatio(_ lhs: TranscriptSegment, _ rhs: TranscriptSegment) -> Double {
    let overlap = max(0, min(lhs.end, rhs.end) - max(lhs.start, rhs.start))
    let shorter = max(0.001, min(lhs.end - lhs.start, rhs.end - rhs.start))
    return overlap / shorter
}

private func vietnameseEvidence(in text: String) -> Int {
    let marked = CharacterSet(charactersIn: "ăâđêôơưĂÂĐÊÔƠƯáàảãạấầẩẫậắằẳẵặéèẻẽẹếềểễệíìỉĩịóòỏõọốồổỗộớờởỡợúùủũụứừửữựýỳỷỹỵÁÀẢÃẠẤẦẨẪẬẮẰẲẴẶÉÈẺẼẸẾỀỂỄỆÍÌỈĨỊÓÒỎÕỌỐỒỔỖỘỚỜỞỠỢÚÙỦŨỤỨỪỬỮỰÝỲỶỸỴ")
    return text.unicodeScalars.reduce(0) { $0 + (marked.contains($1) ? 1 : 0) }
}

private func candidateScore(_ segment: TranscriptSegment, peers: [TranscriptSegment]) -> Double {
    var score = segment.confidence ?? 0.50
    let normalized = normalizedTranscriptText(segment.text)
    if peers.contains(where: { peer in
        peer != segment && peer.alternatives.contains { normalizedTranscriptText($0) == normalized }
    }) { score += 0.08 }
    if segment.localeIdentifier.hasPrefix("vi"), vietnameseEvidence(in: segment.text) > 0 { score += 0.04 }
    return score
}

/// Merges finalized, time-indexed local recognition passes conservatively.
/// Overlapping candidates are treated as competing readings of the same audio.
/// Exact normalized duplicates collapse; otherwise confidence, alternative agreement,
/// locale-script evidence, then stable locale/text ordering choose one candidate.
/// Non-overlapping segments remain chronological, which preserves code switching.
func mergeTranscriptSegments(_ input: [TranscriptSegment]) -> [TranscriptSegment] {
    let usable = input.filter { !$0.text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty }
        .sorted {
            if $0.start != $1.start { return $0.start < $1.start }
            if $0.end != $1.end { return $0.end < $1.end }
            if $0.localeIdentifier != $1.localeIdentifier { return $0.localeIdentifier < $1.localeIdentifier }
            return $0.text < $1.text
        }
    var clusters: [[TranscriptSegment]] = []
    for segment in usable {
        if let last = clusters.indices.last,
           clusters[last].contains(where: { overlapRatio($0, segment) >= 0.55 }) {
            clusters[last].append(segment)
        } else {
            clusters.append([segment])
        }
    }
    return clusters.compactMap { cluster in
        var unique: [String: TranscriptSegment] = [:]
        for candidate in cluster {
            let key = normalizedTranscriptText(candidate.text)
            guard !key.isEmpty else { continue }
            if let existing = unique[key] {
                if candidateScore(candidate, peers: cluster) > candidateScore(existing, peers: cluster) {
                    unique[key] = candidate
                }
            } else {
                unique[key] = candidate
            }
        }
        return unique.values.sorted {
            let lhs = candidateScore($0, peers: cluster)
            let rhs = candidateScore($1, peers: cluster)
            if lhs != rhs { return lhs > rhs }
            if vietnameseEvidence(in: $0.text) != vietnameseEvidence(in: $1.text) {
                return vietnameseEvidence(in: $0.text) > vietnameseEvidence(in: $1.text)
            }
            if $0.localeIdentifier != $1.localeIdentifier { return $0.localeIdentifier < $1.localeIdentifier }
            return $0.text < $1.text
        }.first
    }
}

func renderTranscript(_ segments: [TranscriptSegment]) -> String {
    segments.map { $0.text.trimmingCharacters(in: .whitespacesAndNewlines) }
        .filter { !$0.isEmpty }
        .joined(separator: " ")
}
