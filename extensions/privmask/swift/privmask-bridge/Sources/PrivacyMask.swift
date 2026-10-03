import Foundation
import PrivMask
import RaycastSwiftMacros

// The bridge between the extension's UI and the detection library.
//
// Detection is split into two calls on purpose. The deterministic layer returns
// in milliseconds and the on-device model takes seconds, and personal names come
// only from the model — so the UI shows what it has immediately and folds the
// model's findings in when they arrive, rather than making the user watch a
// spinner before seeing anything.

struct Finding: Codable {
  let id: String
  let kind: String
  let confidence: String
  let sources: [String]
  let text: String
  let location: Int
  let length: Int

  init(_ candidate: MaskCandidate) {
    id = candidate.id
    kind = candidate.kind.rawValue
    confidence = candidate.confidence.name
    sources = candidate.sources.map(\.rawValue)
    text = candidate.text
    location = candidate.range.location
    length = candidate.range.length
  }

  var candidate: MaskCandidate? {
    guard
      let kind = SensitiveKind(rawValue: kind),
      let confidence = Confidence(name: confidence)
    else { return nil }
    return MaskCandidate(
      kind: kind,
      range: NSRange(location: location, length: length),
      text: text,
      confidence: confidence,
      sources: sources.compactMap(DetectorSource.init(rawValue:))
    )
  }
}

struct DetectRequest: Decodable {
  let text: String
  let dictionaryPath: String?
  let useModel: Bool
  let useNameModel: Bool
  let nameModelPath: String?
}

struct DetectResponse: Encodable {
  let findings: [Finding]
  let modelRan: Bool
  /// Every way in which this run examined less than it could have. The UI shows
  /// these, because a gap the user cannot see is indistinguishable from no gap.
  let notices: [String]
  let dictionaryTermCount: Int
}

/// The user's terms, and anything the user needs to be told about loading them.
private struct TermList {
  let terms: [String]
  /// Set when a path was configured and nothing is there. A term list that
  /// quietly loads nothing looks exactly like a text with no terms in it.
  let notice: String?
}

/// Reads the configured term list, or the shared default when none is set.
///
/// The preference is typed by a person, so it arrives the way a person writes a
/// path: `~/.config/privmask/terms.txt`, which is what the field suggests.
/// The `~` is expanded here, because `URL(fileURLWithPath:)` cannot be relied
/// on to: on macOS 13 it would resolve the path against the working directory.
private func loadTerms(_ path: String?) throws -> TermList {
  guard let path, !path.trimmingCharacters(in: .whitespaces).isEmpty else {
    return TermList(terms: try DictionaryFile.load(), notice: nil)
  }

  let expanded = (path as NSString).expandingTildeInPath
  guard FileManager.default.fileExists(atPath: expanded) else {
    return TermList(
      terms: [],
      notice: "No term list at \(expanded) — your own terms were not looked for."
    )
  }
  return TermList(terms: try DictionaryFile.load(from: URL(fileURLWithPath: expanded)), notice: nil)
}

/// What the trained name model found, and anything the user needs to be told
/// about running it.
private struct NameModelRun {
  let matches: [DetectedMatch]
  let ran: Bool
  let notice: String?

  static let skipped = NameModelRun(matches: [], ran: false, notice: nil)
}

/// Where Homebrew puts the `privmask` CLI, on Apple silicon and on Intel. The
/// name model is installed beside it, and the library finds the model relative
/// to an executable — but the executable running here is this bridge, not the
/// CLI, so the library is pointed at the CLI instead.
private let homebrewCLIs = ["/opt/homebrew/bin/privmask", "/usr/local/bin/privmask"].map(URL.init(fileURLWithPath:))

/// Runs the name model that comes with the `privmask` CLI, when it is installed.
///
/// The model is not shipped with the extension: it is tens of megabytes. With
/// no path configured and no CLI installed, nothing is said, because that is
/// the ordinary case and Apple Intelligence still looks for names. A configured
/// path is used as given, never swapped for another, and said when empty — as
/// the term list is.
private func runNameModel(_ payload: DetectRequest) -> NameModelRun {
  guard payload.useNameModel else { return .skipped }

  let directory: URL
  if let path = payload.nameModelPath, !path.trimmingCharacters(in: .whitespaces).isEmpty {
    let expanded = (path as NSString).expandingTildeInPath
    guard let found = NERResources.directory(environment: ["PRIVMASK_NER_DIR": expanded]) else {
      return NameModelRun(
        matches: [],
        ran: false,
        notice: "No name model at \(expanded) — names were not looked for by it."
      )
    }
    directory = found
  } else {
    guard
      let found = homebrewCLIs.lazy
        .compactMap({ NERResources.directory(environment: [:], executable: $0) })
        .first
    else { return .skipped }
    directory = found
  }

  // Fail open, as the language model does. Loading is inside the catch too: a
  // model this macOS cannot compile fails there, not in detection.
  do {
    let matches = try NERDetector.load(from: directory).detect(in: payload.text)
    return NameModelRun(matches: matches, ran: true, notice: nil)
  } catch {
    return NameModelRun(
      matches: [],
      ran: false,
      notice: "The privmask name model failed (\(error)), so names were not looked for by it."
    )
  }
}

/// Everything that can be found without the language model. Returns immediately.
@raycast func detectFast(payload: DetectRequest) throws -> DetectResponse {
  let list = try loadTerms(payload.dictionaryPath)
  let candidates = DetectionPipeline(dictionaryTerms: list.terms).detect(in: payload.text)
  return DetectResponse(
    findings: candidates.map(Finding.init),
    modelRan: false,
    notices: [list.notice].compactMap { $0 } + ["Looking for personal names…"],
    dictionaryTermCount: list.terms.count
  )
}

/// The same, plus whatever the on-device model adds. Seconds, not milliseconds.
@raycast func detectFull(payload: DetectRequest) async throws -> DetectResponse {
  let list = try loadTerms(payload.dictionaryPath)
  let terms = list.terms
  let pipeline = DetectionPipeline(dictionaryTerms: terms)
  let names = runNameModel(payload)
  var notices: [String] = [list.notice, names.notice].compactMap { $0 }

  guard payload.useModel else {
    return DetectResponse(
      findings: pipeline.detect(in: payload.text, additional: names.matches).map(Finding.init),
      modelRan: false,
      notices: notices + namelessNotices(reason: "the language model is turned off", terms: terms, nameModelRan: names.ran),
      dictionaryTermCount: terms.count
    )
  }

  guard #available(macOS 26.0, *) else {
    return DetectResponse(
      findings: pipeline.detect(in: payload.text, additional: names.matches).map(Finding.init),
      modelRan: false,
      notices: notices + namelessNotices(reason: "this Mac runs macOS 13–25", terms: terms, nameModelRan: names.ran),
      dictionaryTermCount: terms.count
    )
  }

  guard FoundationModelDetector.isAvailable else {
    return DetectResponse(
      findings: pipeline.detect(in: payload.text, additional: names.matches).map(Finding.init),
      modelRan: false,
      notices: notices + namelessNotices(reason: "Apple Intelligence is not available", terms: terms, nameModelRan: names.ran),
      dictionaryTermCount: terms.count
    )
  }

  do {
    let outcome = try await FoundationModelDetector().detect(in: payload.text)

    // A chunk failure is kept inside the outcome rather than thrown, so the run
    // that examined nothing arrives here looking like a success. It is not one:
    // report it exactly as a model that never ran.
    if outcome.chunks > 0, outcome.failures.count == outcome.chunks {
      return DetectResponse(
        findings: pipeline.detect(in: payload.text, additional: names.matches).map(Finding.init),
        modelRan: false,
        notices: notices + namelessNotices(reason: "the language model failed", terms: terms, nameModelRan: names.ran),
        dictionaryTermCount: terms.count
      )
    }

    // The whole input is read, a chunk at a time, so length no longer costs
    // coverage — but a chunk that failed is text nothing looked at for names,
    // and that is the one gap no other layer covers.
    if let notice = unexaminedNotice(failures: outcome.failures, chunks: outcome.chunks) {
      notices.append(notice)
    }
    return DetectResponse(
      findings: pipeline.detect(in: payload.text, additional: names.matches + outcome.matches).map(Finding.init),
      modelRan: true,
      notices: notices,
      dictionaryTermCount: terms.count
    )
  } catch {
    // Fail open. The model is an addition; losing it must not lose everything
    // the deterministic layers already found. The loss is reported, never hidden.
    return DetectResponse(
      findings: pipeline.detect(in: payload.text, additional: names.matches).map(Finding.init),
      modelRan: false,
      notices: notices + namelessNotices(reason: "the language model failed", terms: terms, nameModelRan: names.ran),
      dictionaryTermCount: terms.count
    )
  }
}

/// What to say about chunks the model never examined, if there were any.
///
/// Rolled up into one line: the count is what the user acts on, and a line per
/// failed chunk would push the findings off the screen just when the run went
/// wrong. The reason is carried only when every failure shares one, because a
/// list of differing reasons is not a sentence.
///
/// Only ever a partial loss — a run where every chunk failed is reported as a
/// model that never ran, before this is reached.
private func unexaminedNotice(
  failures: [BatchedNameRun.ChunkFailure],
  chunks: Int
) -> String? {
  guard !failures.isEmpty else { return nil }
  let reasons = Set(failures.map(\.reason))
  let because = reasons.count == 1 ? " (\(reasons.first!))" : ""
  return "\(failures.count) of \(chunks) parts of the text could not be examined, "
    + "so that text was not checked for names\(because)."
}

/// What to say when the model did not run.
///
/// Two capabilities depend on it: Japanese personal names, which the name model
/// covers in part when it is installed, and matching a dictionary term written
/// a different way from how it was registered, which nothing else provides.
private func namelessNotices(reason: String, terms: [String], nameModelRan: Bool) -> [String] {
  var notices = [
    nameModelRan
      ? "Japanese personal names were looked for by the privmask name model alone, because \(reason)."
      : "Japanese personal names were not looked for, because \(reason)."
  ]
  if !terms.isEmpty {
    notices.append("Your terms were matched exactly; spelling variants were not.")
  }
  return notices
}

struct MaskRequest: Decodable {
  let text: String
  let selected: [Finding]
}

struct Replacement: Encodable {
  let original: String
  let placeholder: String
  let kind: String
}

struct MaskResponse: Encodable {
  let text: String
  let replacements: [Replacement]
}

/// Applies exactly the findings the user kept.
@raycast func maskText(payload: MaskRequest) -> MaskResponse {
  let candidates = payload.selected.compactMap(\.candidate)
  let result = Masker().mask(payload.text, candidates: candidates)
  return MaskResponse(
    text: result.text,
    replacements: result.replacements.map {
      Replacement(original: $0.original, placeholder: $0.placeholder, kind: $0.kind.rawValue)
    }
  )
}
