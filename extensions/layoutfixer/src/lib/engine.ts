import { Clipboard, environment, getPreferenceValues, getSelectedText } from "@raycast/api";
import { setTimeout as sleep } from "timers/promises";
import { Change, fixText, FixMode, FixResult } from "./convert";
import { Dictionaries } from "./dictionaries";
import { Finglish } from "./finglish";
import { detectLang, Lang, LayoutPair, layouts, PersianLayout } from "./layouts";
import {
  AutoSelect,
  deselect,
  getFrontmostApp,
  getInputSources,
  InputSources,
  macSpellCheck,
  persianLayoutFor,
  selectBackwards,
  selectLayout,
} from "./macos";
import { CleanupOptions, cleanUpPersian } from "./persian";
import { isCheckable, Misspelling, Speller, splitWords, wordCore } from "./spelling";
import { addHistory, getPersonalWords, HistoryKind, setLastFix } from "./storage";

export type Prefs = Preferences;

export function prefs(): Prefs {
  return getPreferenceValues<Prefs>();
}

export function cleanupOptions(p: Prefs = prefs()): CleanupOptions {
  return {
    halfSpace: p.cleanupHalfSpace,
    punctuation: p.cleanupPunctuation,
    digits: p.cleanupDigits,
    spaces: p.cleanupSpaces,
  };
}

export interface Engine {
  prefs: Prefs;
  dicts: Dictionaries;
  speller: Speller;
  pair: LayoutPair;
  sources: InputSources | null;
}

let dicts: Dictionaries | undefined;
let finglish: Finglish | undefined;

/** The Finglish converter; built on first use since it indexes the whole Persian word list. */
export function getFinglish(engine: Engine): Finglish {
  return (finglish ??= new Finglish(engine.dicts));
}

/** Loads the word lists, personal dictionary and keyboard layouts this run needs. */
export async function loadEngine(): Promise<Engine> {
  const p = prefs();
  dicts ??= Dictionaries.load(environment.assetsPath);
  const ignored = p.ignoredWords
    .split(/[,،\n]/)
    .map((w) => w.trim())
    .filter(Boolean);
  dicts.setPersonalWords([...(await getPersonalWords()), ...ignored]);

  let sources: InputSources | null = null;
  try {
    sources = await getInputSources();
  } catch {
    // Without access to input sources we can still convert; we just can't detect or switch layouts.
  }
  const persian: PersianLayout =
    p.persianLayout === "auto" ? (sources ? persianLayoutFor(sources) : "isiri2901") : p.persianLayout;
  return { prefs: p, dicts, speller: new Speller(dicts), pair: layouts(persian), sources };
}

export interface Fixed extends FixResult {
  original: string;
  cleaned: boolean;
}

/** The layout fix with every option from the settings applied. */
export function runFix(engine: Engine, text: string, opts: { explicit: boolean; mode?: FixMode }): Fixed {
  const p = engine.prefs;
  const result = fixText(text, engine.dicts, engine.pair, {
    mode: opts.mode ?? p.mode,
    fallbackToAll: opts.explicit && p.fallbackToAll,
    capsLock: p.capsLock,
    persianDigits: p.persianDigits,
    speller: p.autoSpell ? engine.speller : undefined,
  });
  let cleaned = false;
  if (p.cleanupAfterFix && result.target === "fa") {
    const tidy = cleanUpPersian(result.text, cleanupOptions(p), engine.dicts);
    cleaned = tidy !== result.text;
    result.text = tidy;
  }
  return { ...result, original: text, cleaned };
}

export function languageName(lang: Lang): string {
  return lang === "fa" ? "فارسی" : "English";
}

/** A short HUD line describing what changed. */
export function describeFix(fixed: { text: string; target: Lang | null; changes: Set<Change> }, showText: boolean) {
  const what = fixed.target
    ? `→ ${languageName(fixed.target)}`
    : fixed.changes.has("capsLock")
      ? "Fixed Caps Lock"
      : "Fixed";
  if (!showText) return what;
  const preview = fixed.text.trim().replace(/\s+/g, " ");
  return `${what}: ${preview.length > 60 ? preview.slice(0, 59) + "…" : preview}`;
}

/** The selected text; with nothing selected, optionally selects the text before the cursor first. */
export async function readSelection(autoSelect: AutoSelect): Promise<{ text: string; auto: boolean } | null> {
  try {
    const text = await getSelectedText();
    if (text) return { text, auto: false };
  } catch {
    // Nothing selected.
  }
  if (autoSelect === "none") return null;
  try {
    await selectBackwards(autoSelect);
    await sleep(80);
    const text = await getSelectedText();
    return text ? { text, auto: true } : null;
  } catch {
    return null;
  }
}

export interface TextSource {
  text: string;
  from: "selection" | "clipboard";
}

/** For view commands: the selected text, or the clipboard when nothing is selected. */
export async function readSelectionOrClipboard(): Promise<TextSource | null> {
  try {
    const text = await getSelectedText();
    if (text.trim()) return { text, from: "selection" };
  } catch {
    // Nothing selected; try the clipboard.
  }
  const clipboard = await Clipboard.readText();
  return clipboard?.trim() ? { text: clipboard, from: "clipboard" } : null;
}

/** Replaces the selection in the frontmost app with `text`, putting the clipboard back afterwards if asked. */
export async function replaceSelection(text: string, restoreClipboard: boolean): Promise<void> {
  const previous = restoreClipboard ? await Clipboard.read().catch(() => undefined) : undefined;
  await Clipboard.paste(text);
  if (previous && (previous.text || previous.file || previous.html)) {
    // Give the app time to read the pasted text before the old clipboard comes back.
    await sleep(350);
    if (previous.file) await Clipboard.copy({ file: previous.file });
    else if (previous.html) await Clipboard.copy({ html: previous.html, text: previous.text });
    else await Clipboard.copy(previous.text);
  }
}

/** Leaves text we selected ourselves unselected again. */
export async function undoAutoSelect(auto: boolean): Promise<void> {
  if (auto) await deselect().catch(() => undefined);
}

export async function switchTo(engine: Engine, lang: Lang | null): Promise<boolean> {
  if (!lang || !engine.prefs.switchLayout || engine.sources?.current?.lang === lang) return false;
  return selectLayout(lang).catch(() => false);
}

/**
 * Misspelled words in `text`. Persian always uses the built-in word list; English uses the
 * macOS spell checker when chosen, falling back to the word list if it can't be reached.
 */
export async function checkSpelling(engine: Engine, text: string): Promise<Misspelling[]> {
  if (engine.prefs.englishSpeller !== "macos") return engine.speller.check(text);

  const candidates: Misspelling[] = [];
  splitWords(text).forEach((token, index) => {
    const { core } = wordCore(token);
    const lang = detectLang(core);
    if (!lang || !isCheckable(core) || engine.dicts.isPersonal(core)) return;
    candidates.push({ index, word: core, lang, suggestions: [] });
  });
  const english = candidates.filter((m) => m.lang === "en");
  let mac: Awaited<ReturnType<typeof macSpellCheck>>;
  try {
    mac = await macSpellCheck(english.map((m) => m.word));
  } catch {
    return engine.speller.check(text);
  }
  const result: Misspelling[] = [];
  for (const m of candidates) {
    if (m.lang === "fa") {
      if (!engine.speller.isCorrect(m.word, "fa"))
        result.push({ ...m, suggestions: engine.speller.suggest(m.word, "fa") });
      continue;
    }
    const verdict = mac[english.indexOf(m)];
    if (verdict?.misspelled) result.push({ ...m, suggestions: verdict.guesses.slice(0, 6) });
  }
  return result;
}

/** Saves a fix to the history, and to Undo only when the frontmost app was actually edited. */
export async function remember(
  engine: Engine,
  kind: HistoryKind,
  original: string,
  fixed: string,
  opts: { switched?: boolean; undoable?: boolean } = {},
): Promise<void> {
  if (original === fixed) return;
  if (opts.undoable) {
    await setLastFix({
      original,
      fixed,
      date: Date.now(),
      previousLang: engine.sources?.current?.lang ?? null,
      switched: opts.switched ?? false,
      app: await getFrontmostApp().catch(() => null),
    });
  }
  if (engine.prefs.history) await addHistory(kind, original, fixed);
}
