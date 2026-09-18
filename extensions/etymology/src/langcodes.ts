// Wiktionary language code to canonical name ("ine-pro" -> "Proto-Indo-European").
//
// Read from assets at runtime rather than imported. The table has ~10,000 keys,
// and `resolveJsonModule` would make the compiler infer a 10,000-property object
// type for a value we only ever index by string.
//
// Built by scripts/build-langcodes.mjs. Codes that postdate the snapshot fall
// back to action=expandtemplates, memoised for the session.

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { environment } from "@raycast/api";
import { expandLanguageName } from "./sources/client";

let table: Record<string, string> | undefined;
const resolved = new Map<string, string>();

function load(): Record<string, string> {
  if (!table) {
    table = JSON.parse(readFileSync(join(environment.assetsPath, "langcodes.json"), "utf8"));
  }
  return table as Record<string, string>;
}

/** Synchronous, total: an unknown code is returned as-is rather than dropped. */
export function languageName(code: string | undefined): string {
  if (!code) return "";
  return load()[code] ?? resolved.get(code) ?? code;
}

export function isKnownLanguage(code: string): boolean {
  return code in load() || resolved.has(code);
}

/**
 * Fill in codes the bundled table does not have, so the next render names them.
 * Best effort: failures leave the raw code in place, which is still readable.
 */
export async function resolveUnknownLanguages(codes: string[]): Promise<void> {
  const missing = [...new Set(codes)].filter((c) => c && !isKnownLanguage(c));

  await Promise.all(
    missing.map(async (code) => {
      const name = await expandLanguageName(code);
      if (name) resolved.set(code, name);
    }),
  );
}
