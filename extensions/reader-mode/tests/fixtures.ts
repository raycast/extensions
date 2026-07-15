/**
 * Test fixtures — real HTML captured from real sites.
 *
 * These live outside `src/`, so `ray build` never bundles them: the Raycast Store gets the
 * extension, and the test harness stays a local development tool.
 *
 * The corpus is the point. Every silently-broken feature this suite now guards was broken
 * against real pages while passing every check we had, because we had none.
 */

import { readFileSync, existsSync } from "fs";
import { join } from "path";

/**
 * Captured pages live outside the repo's tracked source, alongside the other private notes.
 * Resolved from the working directory, which the runner pins to the repo root.
 */
export const FIXTURE_DIR = join(process.cwd(), ".github", ".private", "tests");

export function loadFixture(name: string): string {
  const path = join(FIXTURE_DIR, name);

  if (!existsSync(path)) {
    throw new Error(`Missing fixture: ${path}`);
  }

  return readFileSync(path, "utf-8");
}

export function hasFixture(name: string): boolean {
  return existsSync(join(FIXTURE_DIR, name));
}

/**
 * The paywalled pages in the corpus, with the URL each was captured from.
 *
 * None of these domains was on the old detector's thirteen-domain allowlist except
 * Le Monde — which is precisely why their paywalls were never detected.
 */
export const PAYWALLED_FIXTURES = [
  { file: "le-monde-curl.html", url: "https://www.lemonde.fr/article", site: "Le Monde" },
  { file: "vanityfair-ferrix.html", url: "https://www.vanityfair.com/article", site: "Vanity Fair" },
  { file: "sfchronicle.html", url: "https://www.sfchronicle.com/article", site: "SF Chronicle" },
] as const;

/** Pages that are NOT paywalled. Anything flagged here is a false positive. */
export const OPEN_FIXTURES = [{ file: "bbc.html", url: "https://www.bbc.com/news/article", site: "BBC" }] as const;
