import { UNCATEGORIZED } from "./types";
import type { Shortcut } from "./types";
import { normalizeShortcut, mergeShortcuts } from "./schema";

export const SOURCE_DISCOVER = "discover" as const;

const MODIFIER_NAMES: Record<string, string> = {
  "@": "Cmd",
  "^": "Ctrl",
  "~": "Opt",
  $: "Shift",
  "#": "Keypad",
};

const MODIFIER_ORDER = ["Cmd", "Ctrl", "Opt", "Shift", "Keypad"];

const SPECIAL_KEYS: Record<string, string> = {
  "\r": "Return",
  "\n": "Return",
  "\t": "Tab",
  "\u001B": "Esc",
  " ": "Space",
  "\u00A0": "Space",
  "\uF700": "Up",
  "\uF701": "Down",
  "\uF702": "Left",
  "\uF703": "Right",
  "\uF728": "Delete",
  "\uF729": "Home",
  "\uF72B": "End",
  "\uF72C": "Page Up",
  "\uF72D": "Page Down",
};

for (let i = 0xf704; i <= 0xf716; i++) {
  SPECIAL_KEYS[String.fromCharCode(i)] = `F${i - 0xf703}`;
}

export function decodeKeyEquivalent(raw: string): string | null {
  const mods = new Set<string>();
  let i = 0;
  while (i < raw.length) {
    const mod = MODIFIER_NAMES[raw[i]];
    if (!mod) break;
    mods.add(mod);
    i++;
  }

  const chars = [...raw.slice(i)];
  if (chars.length !== 1) return null;

  const ch = chars[0];
  const key = SPECIAL_KEYS[ch] ?? (/^[a-zA-Z]$/.test(ch) ? ch.toUpperCase() : /^[\x20-\x7e]$/.test(ch) ? ch : null);
  if (!key) return null;

  return [...MODIFIER_ORDER.filter((m) => mods.has(m)), key].join(" + ");
}

export function parseAppPreferences(json: unknown, appName: string, sourceFile?: string): Shortcut[] {
  const prefs = (typeof json === "object" && json !== null ? json : {}) as Record<string, unknown>;
  const equivs = prefs.NSUserKeyEquivalents;
  if (typeof equivs !== "object" || equivs === null) return [];

  const out: Shortcut[] = [];
  for (const [rawTitle, rawCode] of Object.entries(equivs)) {
    if (typeof rawCode !== "string") continue;
    const title = rawTitle.trim();
    const keys = decodeKeyEquivalent(rawCode);
    if (!title || !keys) continue;
    out.push(normalizeShortcut({ category: appName, title, keys, source: SOURCE_DISCOVER, sourceFile }));
  }
  return out.sort((a, b) => a.title.localeCompare(b.title));
}

function normalizeKey(v: string): string {
  return v.toLowerCase().replace(/\s+/g, " ").trim();
}

function pairKey(s: Pick<Shortcut, "category" | "title">): string {
  return `${normalizeKey(s.category ?? UNCATEGORIZED)}|${normalizeKey(s.title)}`;
}

/** Same menu item: prefer the plist path so Spotlight/app-name churn cannot retarget rows. */
export function isSameDiscoverItem(
  a: Pick<Shortcut, "category" | "title" | "sourceFile">,
  b: Pick<Shortcut, "category" | "title" | "sourceFile">
): boolean {
  if (a.sourceFile && b.sourceFile) {
    return a.sourceFile === b.sourceFile && normalizeKey(a.title) === normalizeKey(b.title);
  }
  return pairKey(a) === pairKey(b);
}

export interface DiscoveryOutcome {
  next: Shortcut[];
  added: Shortcut[];
  removed: Shortcut[];
}

/**
 * sweep=true ("Import All"): removes a discover-sourced entry only when its own
 * source file was positively re-read this run (`readFiles`) and the entry's
 * title+keys are no longer present in that file. Provenance is the plist path,
 * not the bundle id or display name: a bundle id can span several files (prefs
 * dir + sandbox containers) whose read success differs per run, and the
 * display-name category flips with Spotlight availability — either as an identity
 * silently mis-attributes entries. A freshly-read file with zero shortcuts is
 * still evidence its bindings were removed, so its stale rows get cleaned up;
 * files that were unreadable, absent, or user-detached are never touched.
 * sweep=false (single import): only touches discover-sourced entries for the
 * same source plist + menu title (falling back to category+title when a row
 * has no sourceFile yet).
 */
export function applyDiscovery(
  existing: Shortcut[],
  incoming: Shortcut[],
  sweep: boolean,
  readFiles: Iterable<string> = []
): DiscoveryOutcome {
  let keep: Shortcut[];
  if (sweep) {
    const fresh = new Set(readFiles);
    const freshByFile = new Map<string, Set<string>>();
    for (const s of incoming) {
      if (!s.sourceFile || !fresh.has(s.sourceFile)) continue;
      let set = freshByFile.get(s.sourceFile);
      if (!set) freshByFile.set(s.sourceFile, (set = new Set()));
      set.add(entryKey(s));
    }
    keep = existing.filter((e) => {
      if (e.source !== SOURCE_DISCOVER) return true;
      const file = e.sourceFile;
      if (file === undefined || !fresh.has(file)) return true; // no evidence this run → keep
      return freshByFile.get(file)?.has(entryKey(e)) ?? false; // read but gone → remove
    });
  } else {
    keep = existing.filter((e) => e.source !== SOURCE_DISCOVER || !incoming.some((s) => isSameDiscoverItem(e, s)));
  }

  const removed = existing.filter((e) => !keep.includes(e));
  const { added } = mergeShortcuts(keep, incoming);
  return { next: [...keep, ...added], added, removed };
}

function entryKey(s: Pick<Shortcut, "title" | "keys">): string {
  return `${normalizeKey(s.title)}|${normalizeKey(s.keys)}`;
}
