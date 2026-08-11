// Rewriting text from one keyboard layout into another means answering "which
// physical key produced this character, and what would that same key have typed
// under the other layout?".
//
// Both halves come from the layouts themselves via Carbon's UCKeyTranslate, so
// every enabled layout works — including custom .keylayout bundles — with no
// hardcoded character tables to maintain.

import Carbon
import Foundation

/// A physical key plus the modifiers needed to produce a particular character.
struct KeyStroke: Hashable {
  let keyCode: UInt16
  let modifiers: UInt32
}

struct KeyLayoutMap {
  /// Modifier states, as the *shifted* modifier byte UCKeyTranslate expects
  /// rather than the raw NSEvent masks. Ordered least to most modified: the
  /// reverse map keeps its first hit, so an unmodified key always wins over an
  /// Option combination that happens to produce the same character.
  private static let modifierStates: [UInt32] = [
    0,
    UInt32(shiftKey >> 8),
    UInt32(optionKey >> 8),
    UInt32((shiftKey | optionKey) >> 8),
  ]

  private var forward: [KeyStroke: Character] = [:]
  private var reverse: [Character: KeyStroke] = [:]

  /// Returns nil for input sources that expose no Unicode key layout data, which
  /// is the case for CJKV input methods among others. Those remain switchable —
  /// they just cannot take part in text conversion.
  init?(source: TISInputSource) {
    guard let pointer = TISGetInputSourceProperty(source, kTISPropertyUnicodeKeyLayoutData) else {
      return nil
    }

    let data = Unmanaged<CFData>.fromOpaque(pointer).takeUnretainedValue() as Data
    let keyboardType = UInt32(LMGetKbdType())

    data.withUnsafeBytes { raw in
      guard let layout = raw.baseAddress?.assumingMemoryBound(to: UCKeyboardLayout.self) else { return }

      for keyCode in UInt16(0)...127 {
        for modifiers in Self.modifierStates {
          guard let character = Self.translate(
            layout: layout,
            keyCode: keyCode,
            modifiers: modifiers,
            keyboardType: keyboardType
          ) else { continue }

          let stroke = KeyStroke(keyCode: keyCode, modifiers: modifiers)
          forward[stroke] = character
          if reverse[character] == nil {
            reverse[character] = stroke
          }
        }
      }
    }

    if forward.isEmpty { return nil }
  }

  private static func translate(
    layout: UnsafePointer<UCKeyboardLayout>,
    keyCode: UInt16,
    modifiers: UInt32,
    keyboardType: UInt32
  ) -> Character? {
    var deadKeyState: UInt32 = 0
    var length = 0
    var characters = [UniChar](repeating: 0, count: 8)

    // kUCKeyTranslateNoDeadKeysBit makes dead keys resolve to their spacing
    // character instead of returning nothing and mutating deadKeyState, which
    // keeps this a plain static table. Ukelele-built layouts lean on dead keys.
    let status = UCKeyTranslate(
      layout,
      keyCode,
      UInt16(kUCKeyActionDown),
      modifiers,
      keyboardType,
      OptionBits(kUCKeyTranslateNoDeadKeysBit),
      &deadKeyState,
      characters.count,
      &length,
      &characters
    )

    guard status == noErr, length > 0 else { return nil }

    let string = String(utf16CodeUnits: characters, count: length)
    // Multi-character results and control characters are not usable as a
    // reversible single-character mapping.
    guard string.count == 1, let character = string.first, !character.isNewline,
      character.unicodeScalars.allSatisfy({ !CharacterSet.controlCharacters.contains($0) })
    else { return nil }

    return character
  }

  func stroke(for character: Character) -> KeyStroke? {
    reverse[character]
  }

  func character(for stroke: KeyStroke) -> Character? {
    forward[stroke]
  }

  /// Fraction of the meaningful characters in `text` this layout can produce.
  /// Used to guess which layout the text was typed with.
  func coverage(of text: String) -> Double {
    let candidates = text.filter { !$0.isWhitespace }
    guard !candidates.isEmpty else { return 0 }

    let known = candidates.filter { reverse[$0] != nil }.count
    return Double(known) / Double(candidates.count)
  }

  /// Rewrites `text` as if the same physical keys had been pressed under
  /// `target`. Characters this layout cannot produce pass through unchanged, so
  /// shared punctuation and digits survive untouched.
  func convert(_ text: String, to target: KeyLayoutMap) -> String {
    String(
      text.map { character in
        guard let stroke = reverse[character], let replacement = target.character(for: stroke) else {
          return character
        }
        return replacement
      })
  }
}
