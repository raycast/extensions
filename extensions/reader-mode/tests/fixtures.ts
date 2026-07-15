/**
 * Test fixtures.
 *
 * The committed corpus lives in `tests/fixtures/` and is **synthetic** — hand-written pages
 * that reproduce the *structure* of real paywalls (the barrier markup and gating language
 * that detection keys on) without copying any publisher's actual article. That keeps the
 * suite runnable for every contributor, and keeps commercial article HTML out of the repo.
 *
 * A larger corpus of *real* captured pages can live in `.github/.private/tests/` (gitignored).
 * When present, the suite also runs against it for deeper validation; when absent — the normal
 * case for a fresh clone — those extra checks simply don't run. The synthetic corpus is the
 * baseline that always runs.
 */

import { readFileSync, existsSync } from "fs";
import { join } from "path";

// Paths are resolved from the working directory, which the runner (tests/run.mjs) pins to the
// repo root. Not from import.meta.url — the suite runs as an esbuild bundle in a temp dir, so
// a source-relative path would point at the bundle, not the checkout.

/** Committed, synthetic fixtures — always present. */
export const FIXTURE_DIR = join(process.cwd(), "tests", "fixtures");

/** Optional corpus of real captured pages — gitignored, present only on a maintainer's machine. */
export const PRIVATE_FIXTURE_DIR = join(process.cwd(), ".github", ".private", "tests");

export function loadFixture(name: string): string {
  const path = join(FIXTURE_DIR, name);
  if (!existsSync(path)) {
    throw new Error(`Missing committed fixture: ${path}`);
  }
  return readFileSync(path, "utf-8");
}

export function hasPrivateFixture(name: string): boolean {
  return existsSync(join(PRIVATE_FIXTURE_DIR, name));
}

export function loadPrivateFixture(name: string): string {
  return readFileSync(join(PRIVATE_FIXTURE_DIR, name), "utf-8");
}

/**
 * Synthetic paywalled fixtures (committed). Each mirrors the barrier structure of a real
 * site so a regression in detection fails here, on a fresh clone, with no private corpus.
 */
export const PAYWALLED_FIXTURES = [
  {
    file: "paywalled-lemonde-style.html",
    url: "https://example.com/premium-article",
    site: "Le Monde-style (--premium wrapper)",
  },
  {
    file: "paywalled-vanityfair-style.html",
    url: "https://example.com/feature",
    site: "Condé Nast-style (inline barrier)",
  },
] as const;

/** Synthetic open article (committed). Anything flagged here is a false positive. */
export const OPEN_FIXTURES = [
  { file: "open-article.html", url: "https://example.com/post", site: "open article" },
] as const;

/**
 * Real captured pages, if the private corpus is present. Same assertions, higher fidelity —
 * these are the actual sites the fixes were validated against.
 */
export const PRIVATE_PAYWALLED_FIXTURES = [
  { file: "le-monde-curl.html", url: "https://www.lemonde.fr/article", site: "Le Monde (real)" },
  { file: "vanityfair-ferrix.html", url: "https://www.vanityfair.com/article", site: "Vanity Fair (real)" },
  { file: "sfchronicle.html", url: "https://www.sfchronicle.com/article", site: "SF Chronicle (real)" },
] as const;

export const PRIVATE_OPEN_FIXTURES = [
  { file: "bbc.html", url: "https://www.bbc.com/news/article", site: "BBC (real)" },
] as const;
