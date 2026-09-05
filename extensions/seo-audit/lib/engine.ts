// The engine, with types — declared once, here.
//
// `src/*.mjs` is plain ESM with no type declarations, and it stays that way:
// the command line's whole premise is that it runs under `npx` with nothing
// installed, and a build step to emit types would be a build step. TypeScript
// infers what it can from the JavaScript and gets it partly wrong, so this file
// says what the shapes are.
//
// One file, so there is one place that asserts what the engine returns. If a
// component cast at its own call site instead, four components would each hold
// their own opinion about the engine and three of them would eventually be out
// of date.
//
// TypeScript does infer something from the JavaScript, and what it infers is
// narrower than the truth — it sees the three options the engine happens to
// destructure and none of the ones it reads off `opts` later. The annotations
// below widen it deliberately.

import { audit as rawAudit, preview as rawPreview } from "@nurkamol/seo-audit";
import { causePayload as rawCausePayload } from "@nurkamol/seo-audit/causes";

export type Level = "error" | "warn" | "info";

export interface Finding {
  level: Level;
  id: string;
  title: string;
  detail: string;
  url?: string;
  indexable?: boolean;
  reach?: { inlinks: number; depth: number | null };
  traffic?: { impressions: number; clicks: number };
}

export interface Cause {
  id: string;
  title: string;
  level: Level;
  section: string;
  count: number;
  pages: string[];
  scope: string;
  area?: string;
}

export interface Meta {
  origin: string;
  pages: number;
  requests?: number;
  ms?: number;
  date?: string;
  ignored?: number;
  notIndexable?: number;
  sitemap?: string;
}

/** The corrected sitemap, when a run asked for one. `xml` is null when the
 *  engine refused — a crawl that did not see the whole site — and `refused`
 *  says why, which is the half worth showing. */
export interface RebuiltSitemap {
  xml: string | null;
  urls: string[];
  added: string[];
  refused: string | null;
}

export interface Report {
  meta: Meta;
  findings: Finding[];
  causes: Cause[];
  sitemap?: RebuiltSitemap;
}

/** What `--dry-run` answers. `wouldCheck` is null when there is no sitemap:
 *  following links cannot know in advance how many pages it will find, and a
 *  number nobody can stand behind is worse than none. */
export interface Plan {
  origin: string;
  reachable: boolean;
  rateLimited: boolean;
  sitemap: string | null;
  listed: number;
  wouldCheck: number | null;
  skippedByLimit: number;
  limit: number;
  requests: number;
  ms: number;
  sections: { path: string; count: number }[];
  sample: string[];
}

export interface CrawlOptions {
  limit?: number;
  exclude?: string[];
  since?: string;
  ignore?: string[];
  psi?: string[];
  psiSample?: number;
  psiStrategy?: "mobile" | "desktop";
  writeSitemap?: boolean;
  concurrency?: number;
  checkExternal?: boolean;
  sitemap?: string;
  userAgent?: string;
  onProgress?: (event: { phase?: string; url?: string; detail?: string; status?: number }) => void;
}

// Assertions rather than annotations, and the reason is worth writing down.
// `level` is one of exactly three strings — every `f('warn', …)` in
// `src/checks.mjs` and `src/site.mjs` passes a literal — but TypeScript reading
// plain JavaScript can only see `string`, so the narrow type is true and
// unprovable from here. The alternative is `string` everywhere, re-narrowed at
// every icon lookup in every component, which trades one honest assertion for
// several dishonest ones.
//
// The thing that keeps this from rotting is `test/raycast.test.mjs`, which
// exercises these against the real engine rather than against the types.

export const audit = rawAudit as unknown as
  (target: string, options?: CrawlOptions) =>
    Promise<{ findings: Finding[]; meta: Meta; sitemap?: RebuiltSitemap }>;

export const preview = rawPreview as unknown as
  (target: string, options?: CrawlOptions) => Promise<Plan>;

export const causePayload = rawCausePayload as unknown as
  (findings: Finding[], totalPages: number) => Cause[];
