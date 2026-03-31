// sources.ts — pure logic, zero Raycast imports.
// This module is the testable core: parsing, filtering, alias/display-name mapping.

export interface InputSource {
  id: string;
  name: string;
  kind: string;
}

// MARK: - Display name overrides
//
// Apple uses archaic or technical names internally. These override what is shown in the UI.
// Keys are the kTISPropertyInputSourceID values returned by the Swift helper.
// NOTE: The Belarusian layout ID must be verified at runtime via `InputSourceHelper list`
// since it may differ from the plist's KeyboardLayout Name ("Byelorussian").
const DISPLAY_NAME_OVERRIDES: Readonly<Record<string, string>> = {
  "com.apple.keylayout.Byelorussian": "Belarusian",
  "com.apple.inputmethod.SCIM.ITABC": "Pinyin — Simplified Chinese",
  "com.apple.inputmethod.Kotoeri.RomajiTyping": "Japanese (Romaji)",
  "com.apple.keylayout.US-Extended": "English (US Extended)",
  "com.apple.keylayout.Ukrainian-PC": "Ukrainian (PC)",
  "com.apple.keylayout.PolishPro": "Polish (Pro)",
};

// MARK: - Alias map
//
// Additional search terms per source. Users can type any of these to match the source.
// All values are lowercased — comparison is always case-insensitive.
const ALIAS_MAP: Readonly<Record<string, readonly string[]>> = {
  "com.apple.keylayout.Byelorussian": ["belarusian", "byelorussian", "by", "bel"],
  "com.apple.inputmethod.SCIM.ITABC": ["pinyin", "zh", "chinese", "cn", "simplified"],
  "com.apple.inputmethod.Kotoeri.RomajiTyping": ["japanese", "jp", "romaji", "ja"],
  "com.apple.keylayout.US-Extended": ["english", "us", "en", "latin"],
  "com.apple.keylayout.Ukrainian-PC": ["ukrainian", "uk", "ua"],
  "com.apple.keylayout.PolishPro": ["polish", "pl"],
  "com.apple.keylayout.Russian": ["russian", "ru"],
};

// MARK: - Public API

/**
 * Returns the human-facing display name for a source.
 * Falls back to the raw `name` field from the helper if no override exists.
 */
export function displayName(source: InputSource): string {
  return DISPLAY_NAME_OVERRIDES[source.id] ?? source.name;
}

/**
 * Returns all lowercase search terms for a source: display name, raw name, and any aliases.
 * Raycast's built-in fuzzy filter operates on the List.Item title, but this function
 * is used by tests and can be used to build custom keywords.
 */
export function searchTerms(source: InputSource): string[] {
  const terms = new Set<string>();
  terms.add(displayName(source).toLowerCase());
  terms.add(source.name.toLowerCase());
  const aliases = ALIAS_MAP[source.id] ?? [];
  for (const alias of aliases) {
    terms.add(alias);
  }
  return Array.from(terms);
}

/**
 * Parses the JSON output of `InputSourceHelper list`.
 * Throws SyntaxError if the input is not valid JSON.
 * Throws TypeError if the parsed value is not an array.
 */
export function parseSources(json: string): InputSource[] {
  const parsed: unknown = JSON.parse(json);
  if (!Array.isArray(parsed)) {
    throw new TypeError("Expected JSON array from InputSourceHelper list");
  }
  return parsed.map((item: unknown) => {
    if (
      typeof item !== "object" ||
      item === null ||
      typeof (item as Record<string, unknown>)["id"] !== "string" ||
      typeof (item as Record<string, unknown>)["name"] !== "string" ||
      typeof (item as Record<string, unknown>)["kind"] !== "string"
    ) {
      throw new TypeError(`Unexpected shape in source item: ${JSON.stringify(item)}`);
    }
    const { id, name, kind } = item as { id: string; name: string; kind: string };
    return { id, name, kind };
  });
}

/**
 * Returns true for keyboard layouts and input methods.
 * The Swift helper already filters by category, but this provides a second layer
 * for any kind values that slip through (e.g. in tests with mock data).
 */
export function isKeyboardSource(source: InputSource): boolean {
  const nonKeyboardKinds = new Set([
    "com.apple.inputsource.type.character-palette",
    "com.apple.inputsource.type.press-and-hold",
    // Fallback string variants that may appear in older macOS versions
    "CharacterPalette",
    "PressAndHold",
  ]);
  return !nonKeyboardKinds.has(source.kind);
}
