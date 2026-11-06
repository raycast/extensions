/**
 * Parser for `brew vulns --json` (Homebrew 7).
 *
 * Shape, from `Library/Homebrew/vulns/output.rb`:
 *   { findings: [ { formula, version, tag, repo_url, vulnerabilities: [...], patched: [...] } ],
 *     skipped_formulae: [ ... ], unscanned_formulae: { name: reason }, outdated_without_sbom: [ ... ] }
 *
 * `formula`, `skipped_formulae` and `outdated_without_sbom` are full names
 * (`vulns/scanner.rb`); `unscanned_formulae` keys are short names.
 * `unscanned_formulae` (Homebrew 7.0.10+) names installed formulae brew didn't
 * scan at all, because their tap isn't trusted or brew couldn't load them.
 * `outdated_without_sbom` names installed formulae older than the current one
 * with no install-time SBOM, so brew checked the current version instead and
 * warns that their results aren't accurate. A finding
 * with no open advisory is dropped here — brew still serializes it when every
 * advisory was closed by a Homebrew patch, but it is not something to report.
 *
 * Pure: imports nothing but the error type, so it is unit-testable without the
 * Raycast runtime.
 */

import { ParseError } from "../errors";

export type VulnSeverity = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "UNKNOWN";

export interface Vulnerability {
  id: string;
  severity: VulnSeverity;
  summary: string;
  aliases: string[];
  /** Raw `fixed_versions` from brew, unclassified (versions or upstream commit SHAs). Shown verbatim. */
  fixedVersions: string[];
}

export interface VulnFinding {
  formula: string;
  version: string;
  tag: string;
  repoUrl: string;
  /** Open advisories, worst severity first. */
  open: Vulnerability[];
  patched: Vulnerability[];
  /** Highest severity across `open`; UNKNOWN when nothing ranks. */
  severity: VulnSeverity;
}

export interface UnscannedFormula {
  formula: string;
  reason: "untrusted_tap" | "resolution_error" | (string & {});
}

export interface VulnResults {
  findings: VulnFinding[];
  skipped: string[];
  unscanned: UnscannedFormula[];
  outdatedWithoutSbom: string[];
}

/** `VulnResults` as Raycast may have cached it, from before the coverage fields existed. */
export type CachedVulnResults = Omit<VulnResults, "unscanned" | "outdatedWithoutSbom"> &
  Partial<Pick<VulnResults, "unscanned" | "outdatedWithoutSbom">>;

export function withCoverageDefaults(cached: CachedVulnResults): VulnResults {
  return { ...cached, unscanned: cached.unscanned ?? [], outdatedWithoutSbom: cached.outdatedWithoutSbom ?? [] };
}

export const SEVERITY_RANK: Record<VulnSeverity, number> = {
  CRITICAL: 4,
  HIGH: 3,
  MEDIUM: 2,
  LOW: 1,
  UNKNOWN: 0,
};

export function osvUrl(id: string): string {
  return `https://osv.dev/vulnerability/${id}`;
}

/** Advisory ids as OSV issues them — anything else is not going into a URL. */
const SAFE_VULN_ID = /^[A-Za-z0-9._-]+$/;

/**
 * Neutralise a string that came from OSV before it is interpolated into
 * Raycast Markdown. Summaries and aliases are third-party prose: an unescaped
 * `[click](https://attacker.invalid)` renders as a live link, and `*`/`_`/`<`
 * silently restyle the rest of the block. Newlines collapse because these are
 * inline fields — a summary must not open a heading or a list.
 */
export function escapeMarkdown(text: string): string {
  return text.replace(/\s*[\r\n]+\s*/g, " ").replace(/[\\*_[\]()<>#`~|]/g, "\\$&");
}

/** `[id](osv-url)` for an id that is safe in a URL; plain escaped text otherwise. */
export function osvLink(id: string): string {
  const safe = escapeMarkdown(id);
  return SAFE_VULN_ID.test(id) ? `[${safe}](${osvUrl(id)})` : safe;
}

function toSeverity(raw: unknown): VulnSeverity {
  const upper = str(raw).toUpperCase();
  if (upper in SEVERITY_RANK) return upper as VulnSeverity;
  // brew upcases OSV's own severity strings, which use `moderate` where the
  // rest of the pipeline says MEDIUM.
  if (upper === "MODERATE") return "MEDIUM";
  return "UNKNOWN";
}

/** A string field, or "" for anything else brew put there. */
function str(raw: unknown): string {
  return typeof raw === "string" ? raw : "";
}

function unscannedIn(raw: unknown): UnscannedFormula[] {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return [];
  return Object.entries(raw)
    .map(([formula, reason]) => ({ formula, reason: str(reason) }))
    .sort((a, b) => a.formula.localeCompare(b.formula));
}

function stringsIn(raw: unknown): string[] {
  return Array.isArray(raw) ? raw.filter((v): v is string => typeof v === "string") : [];
}

function toVulnerability(raw: unknown): Vulnerability {
  const v = (raw ?? {}) as Record<string, unknown>;
  return {
    id: str(v.id),
    severity: toSeverity(v.severity),
    summary: str(v.summary),
    aliases: stringsIn(v.aliases),
    fixedVersions: stringsIn(v.fixed_versions),
  };
}

function bySeverityDesc(a: Vulnerability, b: Vulnerability): number {
  return SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity];
}

export function parseBrewVulns(json: string): VulnResults {
  let root: unknown;
  try {
    root = JSON.parse(json);
  } catch (err) {
    throw new ParseError("Unexpected brew vulns output", { cause: err as Error });
  }

  const { findings, skipped_formulae, unscanned_formulae, outdated_without_sbom } = (root ?? {}) as {
    findings?: unknown;
    skipped_formulae?: unknown;
    unscanned_formulae?: unknown;
    outdated_without_sbom?: unknown;
  };
  if (!Array.isArray(findings)) {
    throw new ParseError("Unexpected brew vulns output");
  }

  const parsed: VulnFinding[] = [];
  for (const raw of findings) {
    const f = (raw ?? {}) as Record<string, unknown>;
    const open = (Array.isArray(f.vulnerabilities) ? f.vulnerabilities : []).map(toVulnerability).sort(bySeverityDesc);
    if (open.length === 0) continue; // patched-only: nothing to report
    parsed.push({
      formula: str(f.formula),
      version: str(f.version),
      tag: str(f.tag),
      repoUrl: str(f.repo_url),
      open,
      patched: (Array.isArray(f.patched) ? f.patched : []).map(toVulnerability).sort(bySeverityDesc),
      severity: open[0].severity,
    });
  }

  parsed.sort(
    (a, b) =>
      SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity] ||
      b.open.length - a.open.length ||
      a.formula.localeCompare(b.formula),
  );

  return {
    findings: parsed,
    skipped: stringsIn(skipped_formulae),
    unscanned: unscannedIn(unscanned_formulae),
    outdatedWithoutSbom: stringsIn(outdated_without_sbom),
  };
}
