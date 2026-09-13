// Rewrites text that was typed with the wrong keyboard layout active.
//
// One call returns a conversion into every convertible layout, so the picker can
// render a live preview per layout from a single round trip and the hotkey
// commands can just pick the entry matching their slot.

import Carbon
import Foundation
import RaycastSwiftMacros

struct Conversion: Encodable {
  let layoutId: String
  let layoutName: String
  let text: String
}

struct ConversionSet: Encodable {
  let detectedSourceId: String
  let detectedSourceName: String
  let conversions: [Conversion]
}

enum ConversionError: LocalizedError {
  case emptyText
  case noConvertibleLayouts

  var errorDescription: String? {
    switch self {
    case .emptyText:
      return "There is no text to convert."
    case .noConvertibleLayouts:
      return "None of your enabled input sources expose keyboard layout data, so text cannot be converted."
    }
  }
}

/// Enabled layouts that expose Unicode key layout data, in system order.
private func convertibleLayouts() -> [(id: String, name: String, map: KeyLayoutMap)] {
  selectableSources().compactMap { source in
    guard let map = KeyLayoutMap(source: source.ref) else { return nil }
    return (source.id, source.name, map)
  }
}

/// Guesses which layout the text was typed with by asking each one how much of
/// the text it could have produced.
///
/// Layouts that produce the same characters — U.S. and Polish Pro both cover
/// plain ASCII — tie at full coverage. That is harmless: they map those
/// characters to identical keys, so the conversion result is the same either way.
/// Ties resolve toward the active input source, then system order.
private func detectSource(
  of text: String,
  among layouts: [(id: String, name: String, map: KeyLayoutMap)],
  currentID: String?
) -> (id: String, name: String, map: KeyLayoutMap) {
  var best = layouts[0]
  var bestScore = -1.0

  for layout in layouts {
    let score = layout.map.coverage(of: text)
    let isCurrent = layout.id == currentID
    let bestIsCurrent = best.id == currentID

    if score > bestScore || (score == bestScore && isCurrent && !bestIsCurrent) {
      best = layout
      bestScore = score
    }
  }

  return best
}

@raycast func convertText(text: String) throws -> ConversionSet {
  guard !text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else {
    throw ConversionError.emptyText
  }

  let layouts = convertibleLayouts()
  guard !layouts.isEmpty else { throw ConversionError.noConvertibleLayouts }

  let source = detectSource(of: text, among: layouts, currentID: currentSourceID())

  return ConversionSet(
    detectedSourceId: source.id,
    detectedSourceName: source.name,
    conversions: layouts.map { target in
      Conversion(
        layoutId: target.id,
        layoutName: target.name,
        text: source.map.convert(text, to: target.map)
      )
    }
  )
}
