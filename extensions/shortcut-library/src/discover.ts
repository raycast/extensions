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

export function parseAppPreferences(json: unknown, appName: string): Shortcut[] {
  const prefs = (typeof json === "object" && json !== null ? json : {}) as Record<string, unknown>;
  const equivs = prefs.NSUserKeyEquivalents;
  if (typeof equivs !== "object" || equivs === null) return [];

  const out: Shortcut[] = [];
  for (const [rawTitle, rawCode] of Object.entries(equivs)) {
    if (typeof rawCode !== "string") continue;
    const title = rawTitle.trim();
    const keys = decodeKeyEquivalent(rawCode);
    if (!title || !keys) continue;
    out.push(normalizeShortcut({ category: appName, title, keys, source: SOURCE_DISCOVER }));
  }
  return out.sort((a, b) => a.title.localeCompare(b.title));
}

export function pairKey(s: Pick<Shortcut, "category" | "title">): string {
  const norm = (v: string) => v.toLowerCase().replace(/\s+/g, " ").trim();
  return `${norm(s.category ?? UNCATEGORIZED)}|${norm(s.title)}`;
}

function fullKey(s: Shortcut): string {
  return `${pairKey(s)}|${s.keys.toLowerCase().replace(/\s+/g, " ").trim()}`;
}

export interface DiscoveryOutcome {
  next: Shortcut[];
  added: Shortcut[];
  removed: Shortcut[];
}

/**
 * sweep=true ("Import All"): replaces every discover-sourced entry that no longer
 * matches the scan exactly, so vanished or re-keyed app customizations are cleaned up.
 * `keepCategories` protects discover-sourced entries when part of the scan failed:
 * once any app is unreadable we cannot reliably match its stored identity (a broken
 * Spotlight run resolves to a bundle id where a healthy run stored a display name),
 * so the destructive sweep is skipped entirely rather than risk deleting valid data.
 * sweep=false (single import): only touches discover-sourced entries sharing the
 * incoming items' category+title.
 */
export function applyDiscovery(
  existing: Shortcut[],
  incoming: Shortcut[],
  sweep: boolean,
  keepCategories?: Iterable<string>
): DiscoveryOutcome {
  let keep: Shortcut[];
  if (sweep) {
    const fresh = new Set(incoming.map(fullKey));
    const partial = keepCategories ? hasAny(keepCategories) : false;
    keep = existing.filter((e) => e.source !== SOURCE_DISCOVER || partial || fresh.has(fullKey(e)));
  } else {
    const targets = new Set(incoming.map(pairKey));
    keep = existing.filter((e) => e.source !== SOURCE_DISCOVER || !targets.has(pairKey(e)));
  }

  const removed = existing.filter((e) => !keep.includes(e));
  const { added } = mergeShortcuts(keep, incoming);
  return { next: [...keep, ...added], added, removed };
}

function hasAny(it: Iterable<string>): boolean {
  for (const _ of it) return true;
  return false;
}
