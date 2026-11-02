import { Icon, List, getPreferenceValues } from "@raycast/api";
import type { Keyboard } from "@raycast/api";
import { LanguagePair } from "../lib/languages";
import { SHORTCUTS, formatShortcut } from "../lib/shortcuts";
import { planPronunciation, type PronunciationPreferences } from "../lib/tts";

interface PronounceRow {
  title: string;
  shortcut: { modifiers: Keyboard.KeyModifier[]; key: Keyboard.KeyEquivalent };
}

// Mirrors the guard inside PronounceAction, which renders nothing for a language
// it cannot pronounce. A rail row without an action behind it is a lie.
function pronounceRows(
  languagePair: LanguagePair,
  sourceTitle: string,
  prefs: PronunciationPreferences,
): PronounceRow[] {
  const rows: PronounceRow[] = [];
  if (planPronunciation(languagePair.source.code, prefs).kind !== "unavailable") {
    rows.push({ title: sourceTitle, shortcut: SHORTCUTS.pronounceWord });
  }
  if (planPronunciation(languagePair.target.code, prefs).kind !== "unavailable") {
    rows.push({ title: "Pronounce Translation", shortcut: SHORTCUTS.pronounceTranslation });
  }
  return rows;
}

interface DetailMetadataProps {
  languagePair: LanguagePair;
  sourceTitle?: string;
}

// Raycast splits the detail pane once a metadata block exists. The markdown body
// above it stays the dictionary entry; only the pronunciation rows live here.
export function DetailMetadata({ languagePair, sourceTitle = "Pronounce Word" }: DetailMetadataProps) {
  const rows = pronounceRows(languagePair, sourceTitle, getPreferenceValues<Preferences>());
  if (rows.length === 0) return null;

  return (
    <List.Item.Detail.Metadata>
      {rows.map((row) => (
        <List.Item.Detail.Metadata.Label
          key={row.title}
          title={row.title}
          icon={Icon.SpeakerHigh}
          text={formatShortcut(row.shortcut)}
        />
      ))}
    </List.Item.Detail.Metadata>
  );
}

if (import.meta.vitest) {
  const { describe, it, expect } = import.meta.vitest;

  const pair = (source: string, target: string): LanguagePair => ({
    source: { code: source, name: source },
    target: { code: target, name: target },
  });

  const gemini: PronunciationPreferences = { provider: "gemini", apiKey: "AIzaSyTest", pronunciation: "auto" };

  describe("pronounceRows", () => {
    it("advertises the source row first, with the chords the actions are bound to", () => {
      const rows = pronounceRows(pair("en", "uk"), "Pronounce Word", gemini);
      expect(rows.map((row) => row.title)).toEqual(["Pronounce Word", "Pronounce Translation"]);
      expect(rows[0].shortcut).toBe(SHORTCUTS.pronounceWord);
      expect(rows[1].shortcut).toBe(SHORTCUTS.pronounceTranslation);
    });

    it("drops the row for a language PronounceAction refuses to render", () => {
      expect(pronounceRows(pair("xx", "uk"), "Pronounce Word", gemini).map((row) => row.title)).toEqual([
        "Pronounce Translation",
      ]);
      expect(pronounceRows(pair("en", "xx"), "Pronounce Word", gemini).map((row) => row.title)).toEqual([
        "Pronounce Word",
      ]);
      expect(pronounceRows(pair("xx", "yy"), "Pronounce Word", gemini)).toEqual([]);
    });

    it("uses the caller's wording for the source row so it matches the action title", () => {
      const rows = pronounceRows(pair("en", "uk"), "Pronounce Original", gemini);
      expect(rows[0].title).toBe("Pronounce Original");
    });

    it("follows the active provider: Belarusian has a Gemini voice but no macOS voice", () => {
      const titles = (prefs: PronunciationPreferences) =>
        pronounceRows(pair("en", "be"), "Pronounce Word", prefs).map((row) => row.title);
      expect(titles(gemini)).toEqual(["Pronounce Word", "Pronounce Translation"]);
      expect(titles({ ...gemini, provider: "anthropic", apiKey: "sk-ant-api03-abc" })).toEqual(["Pronounce Word"]);
      expect(titles({ ...gemini, pronunciation: "system" })).toEqual(["Pronounce Word"]);
    });

    it.each(["tts-1", "tts-1-hd"])("hides unsupported system-voice languages for OpenAI model %s", (ttsModel) => {
      const prefs: PronunciationPreferences = { provider: "openai", apiKey: "sk-test", ttsModel };
      expect(pronounceRows(pair("fr", "be"), "Pronounce Word", prefs).map((row) => row.title)).toEqual([
        "Pronounce Word",
      ]);
      expect(pronounceRows(pair("be", "uk"), "Pronounce Word", prefs).map((row) => row.title)).toEqual([
        "Pronounce Translation",
      ]);
    });
  });
}
