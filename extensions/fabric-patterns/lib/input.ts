// Where a quick run's input comes from. Pure: the Raycast readers are injected
// so the order is bun-testable (ISC-13).
//
// Order: Finder selection (only when Finder is the app behind Raycast) ›
// selected text › clipboard › nothing. Only regular files count from Finder,
// so a selected folder falls through. A rejected reader means "nothing
// there" (no selection, or no Accessibility permission) and falls through.

export interface App {
  name: string;
  bundleId?: string;
}

export interface Readers {
  frontmostApp(): Promise<App | undefined>;
  finderPaths(): Promise<string[]>;
  /** True for a regular file; a selected folder is not an input. */
  isFile(path: string): boolean;
  selectedText(): Promise<string>;
  clipboardText(): Promise<string | undefined>;
}

export type Resolved =
  | { source: "finder"; paths: string[]; app?: App }
  | { source: "selection"; text: string; app?: App }
  | { source: "clipboard"; text: string; app?: App }
  | { source: "none"; app?: App };

const FINDER = "com.apple.finder";

const settle = <T>(p: Promise<T>): Promise<T | undefined> => p.catch(() => undefined);

export async function resolveInput(r: Readers): Promise<Resolved> {
  const app = await settle(r.frontmostApp());
  if (app?.bundleId === FINDER) {
    const paths = ((await settle(r.finderPaths())) ?? []).filter((p) => r.isFile(p));
    if (paths.length) return { source: "finder", paths, app };
  }
  const selected = await settle(r.selectedText());
  if (selected?.trim()) return { source: "selection", text: selected, app };
  const clip = await settle(r.clipboardText());
  if (clip?.trim()) return { source: "clipboard", text: clip, app };
  return { source: "none", app };
}

/** What the form and the Result view call the source, e.g. "Selected text (TextEdit)". */
export function sourceLabel(r: Resolved): string {
  switch (r.source) {
    case "finder":
      // Only the first file is run, so the label says so wherever it shows.
      return r.paths.length === 1 ? "Finder file" : `Finder file (first of ${r.paths.length})`;
    case "selection":
      return r.app ? `Selected text (${r.app.name})` : "Selected text";
    case "clipboard":
      return "Clipboard";
    case "none":
      return "Nothing selected";
  }
}

/** True when the text is exactly one http(s) URL, so it is classified as a URL rather than piped as text. */
export function isSingleUrl(text: string): boolean {
  const t = text.trim();
  if (/\s/.test(t)) return false;
  try {
    const u = new URL(t);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * Callers that overlap share one call of `fn`; a call after it settles reads
 * again. Two concurrent getSelectedText() calls return one success and one
 * failure (probed), but a cached answer goes stale: Raycast reopens a
 * still-open command without remounting it, so each action needs a fresh read.
 */
export function shared<T>(fn: () => Promise<T>): () => Promise<T> {
  let p: Promise<T> | undefined;
  return () =>
    (p ??= fn().finally(() => {
      p = undefined;
    }));
}
