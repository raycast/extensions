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
  /** The rest of the domain, when the run was asked to look. Absent rather than
   *  empty when it was not: a report showing no other hosts must not be
   *  readable as a domain that has none. */
  hosts?: HostInventory;
}

/** One host on the domain, as DNS and one request found it. */
export interface HostRow {
  host: string;
  addresses: string[];
  cname: string | null;
  dangling: boolean;
  status: number | null;
  title: string | null;
  redirectsHome: boolean;
  noindex: boolean;
  /** Where a request for `/` actually landed on this host. Anywhere but `/` is
   *  overwhelmingly a login page, and the reason the staging check stayed
   *  quiet. */
  landedPath: string | null;
  checked: boolean;
}

/** What else is on the domain. Discovery is certificate transparency and
 *  verification is DNS plus a request, which is why `found` and `resolved` are
 *  different numbers and both are worth showing. `source` names the log that
 *  answered — two runs can list different hosts because different logs did. */
export interface HostInventory {
  apex: string;
  source: string;
  found: number;
  resolved: number;
  capped: number;
  nameservers: string[];
  mail: string[];
  policies: string[];
  rows: HostRow[];
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

/** The llms.txt this site should have had, built from the site's own titles and
 *  descriptions. `text` is null on the same refusals the sitemap makes, for the
 *  same reason: a file built from a fraction of a site looks complete. */
export interface RebuiltLlms {
  text: string | null;
  urls: string[];
  sections: number;
  refused: string | null;
}

/** The JSON-LD this site could add, built only from strings the crawl read off
 *  it. `refused` can be the good answer: a site that already declares
 *  everything this could write says so. */
export interface GeneratedSchema {
  json: string | null;
  generated: { url: string; jsonld: Record<string, unknown> }[];
  skipped: Record<string, number>;
  refused: string | null;
}

export interface Report {
  meta: Meta;
  findings: Finding[];
  causes: Cause[];
  sitemap?: RebuiltSitemap;
  /** The llms.txt this site should have had. Same arrangement as the sitemap:
   *  built during the crawl, and `refused` is the half worth reading. */
  llms?: RebuiltLlms;
  schema?: GeneratedSchema;
  /** How much of the checklist the site passes, scored by the engine. Optional
   *  because a report kept before scoring existed still has to open. */
  score?: Score;
}

/** The engine's score for a run. Mirrored in `present.d.mts`, which is the file
 *  the non-React half is typed against; both describe `scoreRun()` in
 *  `src/score.mjs` and neither implements any of it. */
export interface Score {
  score?: number;
  grade?: string;
  ifErrorsFixed?: number;
  lost?: number;
  why?: string;
  checks?: { passed: number; failed: number; skipped: number };
  passed?: { id: string; area: string; pass: string }[];
  skipped?: { id: string; area: string; pass: string; why: string }[];
  failed?: { id: string; area: string; level: Level; pages: number; cost: number }[];
  areas?: { name: string; lost: number; passed: number; failed: number }[];
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
  writeLlms?: boolean;
  writeSchema?: boolean;
  concurrency?: number;
  checkExternal?: boolean;
  sitemap?: string;
  userAgent?: string;
  // `true` asks about the site being crawled; a string names the property.
  searchConsole?: string | boolean;
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
    Promise<{
      findings: Finding[];
      meta: Meta;
      sitemap?: RebuiltSitemap;
      llms?: RebuiltLlms;
      schema?: GeneratedSchema;
      score?: Score;
    }>;

export const preview = rawPreview as unknown as
  (target: string, options?: CrawlOptions) => Promise<Plan>;

export const causePayload = rawCausePayload as unknown as
  (findings: Finding[], totalPages: number) => Cause[];
