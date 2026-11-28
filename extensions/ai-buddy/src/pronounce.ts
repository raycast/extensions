import { Cache, environment } from "@raycast/api";
import { ChildProcess, spawn } from "node:child_process";
import { rmSync } from "node:fs";
import { join } from "node:path";
import { dataBlock, modelFor, streamChat } from "./llm";
import { systemPrompt } from "./prompts";

export type Pron = {
  word: string;
  ipa: string;
  pos?: string; // part-of-speech abbreviation: n, v, adj… (Wiktionary may give several: "n, v")
  meaning?: string; // short meaning in your language, as used in the text (AI)
  source: "Wiktionary" | "AI";
};

// Dictionary-style part-of-speech abbreviations: (n), (v), (adj)…
const POS_ABBR: Record<string, string> = {
  noun: "n",
  verb: "v",
  adjective: "adj",
  adverb: "adv",
  pronoun: "pron",
  preposition: "prep",
  conjunction: "conj",
  interjection: "interj",
  determiner: "det",
  "phrasal verb": "phr v",
  idiom: "idiom",
  abbreviation: "abbr",
};
const posAbbr = (pos?: string) => (pos ? (POS_ABBR[pos.toLowerCase().trim()] ?? pos) : undefined);

const wordCount = (text: string) => (text.match(/[A-Za-z']+/g) ?? []).length;
export const isShortText = (text: string) => wordCount(text) <= 3;

type WikiEntry = {
  phonetic?: string;
  phonetics?: { text?: string; audio?: string }[]; // audio only used to spot the US entry
  meanings?: { partOfSpeech?: string }[];
};

/**
 * Wiktionary data via the free dictionaryapi.dev (no key). Entries mix dialects, so prefer the
 * US one, then any other with a recording.
 */
async function lookupWiktionary(word: string, signal: AbortSignal): Promise<Pron[]> {
  const res = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`, { signal });
  if (!res.ok) return [];
  const entries = (await res.json()) as WikiEntry[];
  if (!Array.isArray(entries)) return [];
  const phonetics = entries.flatMap((e) => e.phonetics ?? []).filter((p) => p.text);
  const best = phonetics.find((p) => p.audio?.includes("-us.")) ?? phonetics.find((p) => p.audio) ?? phonetics[0];
  const ipa = best?.text ?? entries.map((e) => e.phonetic).find(Boolean);
  if (!ipa) return [];
  const parts = [...new Set(entries.flatMap((e) => (e.meanings ?? []).map((m) => posAbbr(m.partOfSpeech))))];
  const pos = parts.filter(Boolean).slice(0, 3).join(", ") || undefined;
  return [{ word, ipa, pos, source: "Wiktionary" }];
}

const DICT_TIMEOUT_MS = 3000;
const CACHE_NAMESPACE = "pronunciations-v4"; // bump when the cached shape or lookup rules change
const cache = new Cache({ namespace: CACHE_NAMESPACE });

/** Dictionary IPA from Wiktionary, capped at 3s. Cached per word. */
async function lookupDictionary(word: string, signal: AbortSignal): Promise<Pron[]> {
  const cacheKey = `free|${word}`;
  const cached = cache.get(cacheKey);
  if (cached) return JSON.parse(cached) as Pron[];

  const timeout = AbortSignal.any([signal, AbortSignal.timeout(DICT_TIMEOUT_MS)]);
  const hits = await lookupWiktionary(word, timeout).catch(() => [] as Pron[]);
  if (hits.length) cache.set(cacheKey, JSON.stringify(hits));
  return hits;
}

/** Clears cached IPA lookups (old cache namespaces and recordings from earlier versions included). */
export function clearPronunciationCache() {
  for (const namespace of ["pronunciations", "pronunciations-v2", "pronunciations-v3", CACHE_NAMESPACE])
    new Cache({ namespace }).clear();
  rmSync(join(environment.supportPath, "audio"), { recursive: true, force: true });
}

type AIPick = { word?: string; pos?: string; ipa?: string; meaning?: string };

const toPron = (p: AIPick): Pron => ({
  word: p.word!.trim().toLowerCase(),
  ipa: p.ipa ?? "",
  pos: posAbbr(p.pos),
  meaning: p.meaning?.trim() || undefined,
  source: "AI",
});

/**
 * Streams the AI's JSON array and reports each item as soon as its object is complete,
 * so the first words show up without waiting for the whole list.
 */
async function streamPicks(english: string, signal: AbortSignal, onItem: (item: Pron) => void): Promise<void> {
  const model = modelFor("translate"); // the Vocabulary panel belongs to Buddy Translate
  let raw = "";
  let seen = 0;
  for await (const chunk of streamChat(model, systemPrompt("vocab"), dataBlock("text", english), signal)) {
    raw += chunk;
    const objects = raw.match(/\{[^{}]*\}/g) ?? []; // items are flat objects
    for (; seen < objects.length && seen < 5; seen++) {
      try {
        const pick = JSON.parse(objects[seen]) as AIPick;
        if (pick.word?.trim()) onItem(toPron(pick));
      } catch {
        // malformed item: skip it
      }
    }
  }
}

/**
 * Pronunciations for English text, reported progressively through onUpdate:
 * - short text (≤3 words): straight to the dictionaries (one row per part of speech), AI only
 *   if they have nothing;
 * - sentence: each word the AI picks shows at once (AI IPA + meaning) and is then upgraded to
 *   dictionary IPA as its lookup returns, keeping the part of speech used in the sentence.
 */
export async function loadPronunciations(
  english: string,
  signal: AbortSignal,
  onUpdate: (items: Pron[]) => void,
): Promise<void> {
  if (isShortText(english)) {
    const word = english.trim().toLowerCase();
    const hits = await lookupDictionary(word, signal);
    if (hits.length) return onUpdate(hits);
    let first: Pron | undefined;
    await streamPicks(english, signal, (item) => (first ??= item));
    return onUpdate(first ? [first] : []);
  }

  const items: Pron[] = [];
  const lookups: Promise<void>[] = [];
  await streamPicks(english, signal, (item) => {
    const i = items.push(item) - 1;
    onUpdate([...items]);
    lookups.push(
      lookupDictionary(item.word, signal).then((hits) => {
        // Prefer the dictionary row for the part of speech used in the sentence.
        const hit = hits.find((h) => item.pos && h.pos?.split(", ").includes(item.pos)) ?? hits[0];
        if (hit && !signal.aborted) {
          items[i] = { ...hit, pos: item.pos ?? hit.pos, meaning: item.meaning };
          onUpdate([...items]);
        }
      }),
    );
  });
  await Promise.all(lookups);
}

let speaking: ChildProcess | undefined;

/**
 * Reads text aloud with the macOS system voice (System Settings → Accessibility → Read & Speak).
 * The text goes through stdin, never as an argument, so text starting with "-" can't act as a `say`
 * option. A new playback stops the previous one.
 */
export function speak(text: string, slow = false): Promise<void> {
  speaking?.kill();
  return new Promise((resolve, reject) => {
    const child = spawn("say", ["-r", slow ? "120" : "180"], { stdio: ["pipe", "ignore", "pipe"] });
    speaking = child;
    let stderr = "";
    child.stderr?.on("data", (d) => (stderr += d));
    child.on("error", reject);
    child.on("close", (code, sig) => {
      if (speaking === child) speaking = undefined;
      if (code === 0 || sig)
        resolve(); // killed by a newer playback: not an error
      else reject(new Error(stderr.trim() || `say exited with ${code}`));
    });
    child.stdin?.end(text);
  });
}

export const cambridgeUrl = (word: string) =>
  `https://dictionary.cambridge.org/dictionary/english/${encodeURIComponent(word.toLowerCase().replace(/\s+/g, "-"))}`;
