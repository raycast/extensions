import { execFile } from "child_process";
import { Lang, PersianLayout } from "./layouts";

/** Runs a JavaScript for Automation script; its `run(argv)` result is returned as text. */
function jxa(script: string, ...args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile("/usr/bin/osascript", ["-l", "JavaScript", "-e", script, ...args], { timeout: 10_000 }, (error, stdout) =>
      error ? reject(error) : resolve(stdout.trim()),
    );
  });
}

function appleScript(script: string): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile("/usr/bin/osascript", ["-e", script], { timeout: 10_000 }, (error, stdout) =>
      error ? reject(error) : resolve(stdout.trim()),
    );
  });
}

// MARK: - Keyboard layouts

export interface InputSource {
  id: string;
  lang: Lang;
}

export interface InputSources {
  /** Enabled English and Persian keyboard layouts, one per language. */
  enabled: Partial<Record<Lang, InputSource>>;
  current: InputSource | null;
}

const INPUT_SOURCES = `
ObjC.import("Carbon");
function prop(src, key) {
  const r = $.TISGetInputSourceProperty(src, key);
  return r ? ObjC.deepUnwrap(ObjC.castRefToObject(r)) : null;
}
function describe(src) {
  const langs = prop(src, $.kTISPropertyInputSourceLanguages) || [];
  const first = langs.length ? String(langs[0]) : "";
  const lang = first.startsWith("fa") ? "fa" : first.startsWith("en") ? "en" : null;
  return { id: prop(src, $.kTISPropertyInputSourceID), type: prop(src, $.kTISPropertyInputSourceType), lang };
}
function run(argv) {
  const list = ObjC.castRefToObject($.TISCreateInputSourceList(null, false));
  const sources = [];
  for (let i = 0; i < list.count; i++) {
    const src = list.objectAtIndex(i);
    const info = describe(src);
    if (info.type !== "TISTypeKeyboardLayout" || !info.lang) continue;
    sources.push(info);
    if (argv[0] && info.id === argv[0]) $.TISSelectInputSource(src);
  }
  return JSON.stringify({ sources, current: describe($.TISCopyCurrentKeyboardLayoutInputSource()) });
}`;

async function inputSources(select?: string): Promise<InputSources> {
  const raw = JSON.parse(await jxa(INPUT_SOURCES, ...(select ? [select] : []))) as {
    sources: { id: string; lang: Lang }[];
    current: { id: string; lang: Lang | null };
  };
  const enabled: InputSources["enabled"] = {};
  for (const source of raw.sources) enabled[source.lang] ??= source;
  const current = raw.current.lang ? { id: raw.current.id, lang: raw.current.lang } : null;
  return { enabled, current };
}

export function getInputSources(): Promise<InputSources> {
  return inputSources();
}

/** Switches to the enabled keyboard layout for `lang`. Returns false if there is none. */
export async function selectLayout(lang: Lang): Promise<boolean> {
  const { enabled } = await inputSources();
  const source = enabled[lang];
  if (!source) return false;
  await inputSources(source.id);
  return true;
}

/** Which of our Persian key maps matches the Persian layout enabled on this Mac. */
export function persianLayoutFor(sources: InputSources): PersianLayout {
  return sources.enabled.fa?.id === "com.apple.keylayout.Persian" ? "persian" : "isiri2901";
}

// MARK: - Spelling

export interface MacSpelling {
  misspelled: boolean;
  guesses: string[];
}

const SPELL = `
ObjC.import("AppKit");
function run(argv) {
  const words = JSON.parse(argv[0]);
  const lang = argv[1];
  const checker = $.NSSpellChecker.sharedSpellChecker;
  return JSON.stringify(words.map((w) => {
    const range = checker.checkSpellingOfStringStartingAtLanguageWrapInSpellDocumentWithTagWordCount(w, 0, lang, false, 0, null);
    if (Number(range.length) === 0) return { misspelled: false, guesses: [] };
    const guesses = checker.guessesForWordRangeInStringLanguageInSpellDocumentWithTag($.NSMakeRange(0, w.length), w, lang, 0);
    return { misspelled: true, guesses: guesses.isNil() ? [] : guesses.js.map((g) => g.js) };
  }));
}`;

/** Checks English words with the macOS spell checker, in one call. */
export async function macSpellCheck(words: string[]): Promise<MacSpelling[]> {
  if (!words.length) return [];
  return JSON.parse(await jxa(SPELL, JSON.stringify(words), "en")) as MacSpelling[];
}

// MARK: - Selection

export type AutoSelect = "line" | "word" | "none";

/** Key codes: left arrow 123, right arrow 124. */
const SELECT_SCRIPTS: Record<Exclude<AutoSelect, "none">, string> = {
  line: 'tell application "System Events" to key code 123 using {command down, shift down}',
  word: 'tell application "System Events" to key code 123 using {option down, shift down}',
};

/** Selects back from the cursor in the frontmost app, as if you pressed ⌘⇧← or ⌥⇧←. */
export async function selectBackwards(what: Exclude<AutoSelect, "none">): Promise<void> {
  await appleScript(SELECT_SCRIPTS[what]);
}

const FRONTMOST = `
ObjC.import("AppKit");
function run() {
  const app = $.NSWorkspace.sharedWorkspace.frontmostApplication;
  const id = app.bundleIdentifier;
  if (!id || (id.isNil && id.isNil())) return "";
  const bid = id.js || String(id);
  return bid === "com.raycast.macos" ? "" : bid;
}`;

/** Bundle id of the frontmost app, ignoring Raycast itself. */
export async function getFrontmostApp(): Promise<string | null> {
  const id = await jxa(FRONTMOST);
  return id || null;
}

/** Presses ⌘Z in the frontmost app. */
export async function pressUndo(): Promise<void> {
  await appleScript('tell application "System Events" to keystroke "z" using {command down}');
}

/**
 * Whether Raycast may control the keyboard (needed to select the current line and for Undo).
 * macOS attributes the check to the app that launched the script, which is Raycast.
 */
export async function hasAccessibility(): Promise<boolean | null> {
  try {
    return (
      (await jxa('ObjC.import("ApplicationServices"); function run() { return String($.AXIsProcessTrusted()); }')) ===
      "true"
    );
  } catch {
    return null;
  }
}

export const SETTINGS_URLS = {
  keyboard: "x-apple.systempreferences:com.apple.Keyboard-Settings.extension",
  inputSources: "x-apple.systempreferences:com.apple.Keyboard-Settings.extension?InputSources",
  accessibility: "x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility",
};

/** Collapses the selection to its end, so text we selected ourselves isn't left highlighted. */
export async function deselect(): Promise<void> {
  await appleScript('tell application "System Events" to key code 124');
}
