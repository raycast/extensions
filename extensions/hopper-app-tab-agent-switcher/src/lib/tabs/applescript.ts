// PURE: building AppleScript for sources and parsing what it returns.

import { TabGoneError, type Platform } from "./model";

// ASCII unit/record separators: can't appear in titles, URLs, or paths.
export const FIELD = "\u001f";
export const RECORD = "\u001e";

/**
 * Runs `body` inside `tell application id …` with `F`/`R` bound to the separators and `out` to "", and
 * returns `out`. Returns "" if the app isn't running, so a list never launches an app.
 */
export function listScript(bundleId: string, body: string): string {
  return `if application id ${quote(bundleId)} is not running then return ""
set F to character id 31
set R to character id 30
set out to ""
tell application id ${quote(bundleId)}
${body}
end tell
return out`;
}

/** Runs a select script: `body` returns "ok" once it selected the tab; falling through means it's gone. */
export async function runSelect(platform: Platform, bundleId: string, body: string): Promise<void> {
  const result = await platform.runAppleScript(`tell application id ${quote(bundleId)}
${body}
end tell
return "missing"`);
  if (result !== "ok") throw new TabGoneError();
}

/**
 * Rows of `width` fields from output built with FIELD/RECORD. AppleScript's "missing value" and fields missing
 * from a short row become "", so a surprising row can't crash a parser.
 */
export function parseRecords(out: string, width: number): string[][] {
  return out
    .split(RECORD)
    .filter((r) => r.trim() !== "")
    .map((r) => {
      const fields = r.split(FIELD).map((f) => (f.trim() === "missing value" ? "" : f.trim()));
      return Array.from({ length: width }, (_, i) => fields[i] ?? "");
    });
}

/** AppleScript string literal. */
export function quote(s: string): string {
  return `"${s.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

export const isTrue = (s: string) => s === "true";

export function tildify(path: string): string {
  return path.replace(/^\/Users\/[^/]+/, "~");
}
