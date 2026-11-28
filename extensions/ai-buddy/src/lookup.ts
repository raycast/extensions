import { Cache } from "@raycast/api";
import { promptHash } from "./prompts";

/**
 * Dictionary lookup for a word / short phrase: ONE AI call (prompt "lookup") returns every section
 * as tagged lines, so it can be rendered progressively while it streams and cached as a whole.
 */
const words = new Intl.Segmenter(undefined, { granularity: "word" });

/**
 * A word or a short phrase (up to 3 words), not a message. Words are counted with Intl.Segmenter,
 * so Chinese, Japanese and Thai (no spaces) are counted too; sentence punctuation between words
 * makes it a message.
 */
export const isLookupText = (text: string) => {
  const trimmed = text.trim();
  const count = [...words.segment(trimmed)].filter((s) => s.isWordLike).length;
  if (count > 3) return false;
  return count <= 1 || !/[.!?。！？][\s\S]*\S/.test(trimmed);
};

export type Lookup = {
  meaning: string;
  meaningDone: boolean; // the MEANING line is complete (safe to use its first item)
  context: string;
  phrases: string[];
  examples: { en: string; ipa: string; native: string }[];
};

/**
 * Plain IPA with the sentence's pauses as "|": no markdown, no linking marks, ' → ˈ. When the model
 * gave no pause, one is added at each comma / semicolon / dash of the English sentence (only when
 * the IPA has one word per English word, so the position is certain).
 */
function formatIpa(ipa: string, en: string, complete: boolean) {
  const tokens = ipa
    .replace(/[*_`]/g, "")
    .replace(/['’ʼ]/g, "ˈ")
    .replace(/‿/g, " ")
    .replace(/^\s*\/+|\/+\s*$/g, "")
    .split(/\s+/)
    .filter(Boolean);
  if (complete && !tokens.includes("|")) {
    const words = en.replace(/\*\*/g, "").split(/\s+/);
    if (words.length === tokens.length)
      for (let i = words.length - 2; i >= 0; i--) if (/[,;:—–]$/.test(words[i])) tokens.splice(i + 1, 0, "|");
  }
  return tokens.length ? `/${tokens.join(" ")}/` : "";
}

/** Parses the (possibly still streaming) tagged lines; untagged output is treated as the meaning. */
export function parseLookup(raw: string): Lookup {
  const result: Lookup = { meaning: "", meaningDone: false, context: "", phrases: [], examples: [] };
  const lines = raw.split("\n");
  let tagged = false;
  lines.forEach((line, i) => {
    const m = line.match(/^\s*(MEANING|CONTEXT|PHRASES|EX)\s*:\s*(.*)$/i);
    if (!m) return;
    tagged = true;
    const [, tag, value] = m;
    const v = value.trim();
    switch (tag.toUpperCase()) {
      case "MEANING":
        result.meaning = v;
        result.meaningDone = i < lines.length - 1;
        break;
      case "CONTEXT":
        result.context = v;
        break;
      case "PHRASES":
        result.phrases = v
          .split("|")
          .map((p) => p.trim())
          .filter(Boolean);
        break;
      case "EX": {
        // "en || ipa || native". Two parts: "en || /ipa…" still streaming, or an older "en || native" with no IPA.
        const parts = v.split("||").map((p) => p.trim());
        const second = parts[1] ?? "";
        const [en, ipa, native] =
          parts.length >= 3 ? parts : second.startsWith("/") ? [parts[0], second, ""] : [parts[0], "", second];
        if (en && result.examples.length < 3)
          result.examples.push({ en, ipa: formatIpa(ipa, en, parts.length >= 3), native }); // ⌘1-⌘3
        break;
      }
    }
  });
  if (!tagged) result.meaning = raw.trim(); // model ignored the format: still show something useful
  return result;
}

const cache = new Cache({ namespace: "lookup-v1" }); // bump when the prompt / format changes

// Keyed by prompt too: editing the lookup prompt looks words up again.
const key = (text: string, system: string) => `${promptHash(system)}|${text.trim().toLowerCase()}`;
export const getCachedLookup = (text: string, system: string) => cache.get(key(text, system));
export const setCachedLookup = (text: string, system: string, raw: string) => cache.set(key(text, system), raw);

/** Also drops the cache of the older separate "usage" call. */
export function clearLookupCache() {
  cache.clear();
  new Cache({ namespace: "usage-v1" }).clear();
}
