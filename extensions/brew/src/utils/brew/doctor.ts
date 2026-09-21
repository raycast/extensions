/**
 * Parser for `brew doctor --json` (hidden switch, Homebrew 6.0.12+; complete
 * findings only from 6.0.22, so the command gates on major 7).
 *
 * Shape, from `Library/Homebrew/diagnostic/finding.rb`:
 *   { tier, findings: [ { text, tier, affects, links, remediation } ] }
 * where `tier` is an Integer or the symbol `:unsupported`, and `remediation`
 * is `{ commands: [...], text }` or null. `Finding#to_h` always emits every
 * key, so anything else is a brew this parser does not understand — it throws
 * rather than render half a finding, or worse, an empty command list for a
 * finding that does have a fix.
 *
 * Pure: no Raycast imports, so parsing and report rendering are unit-testable
 * without the Raycast runtime.
 */

import { ParseError } from "../errors";
import { escapeMarkdown } from "./vulns";

export type DoctorTier = number | "unsupported";

export interface DoctorRemediation {
  /** Shell commands brew recommends, in order. May be empty with `text` present. */
  commands: string[];
  text: string;
}

export interface DoctorFinding {
  text: string;
  tier: DoctorTier;
  affects: string[];
  links: string[];
  remediation: DoctorRemediation | null;
}

export interface DoctorReport {
  tier: DoctorTier;
  findings: DoctorFinding[];
}

function fail(what: string): never {
  throw new ParseError(`Unexpected brew doctor output: ${what}`);
}

function toTier(raw: unknown, where: string): DoctorTier {
  if (raw === "unsupported") return "unsupported";
  if (typeof raw === "number" && Number.isInteger(raw)) return raw;
  return fail(`${where} tier`);
}

function toStringArray(raw: unknown, where: string): string[] {
  if (!Array.isArray(raw) || raw.some((v) => typeof v !== "string")) fail(where);
  return raw as string[];
}

function toRemediation(raw: unknown): DoctorRemediation | null {
  if (raw === null) return null;
  if (typeof raw !== "object" || Array.isArray(raw)) fail("remediation");
  const r = raw as Record<string, unknown>;
  if (typeof r.text !== "string") fail("remediation text");
  return { commands: toStringArray(r.commands, "remediation commands"), text: r.text };
}

function toFinding(raw: unknown): DoctorFinding {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) fail("finding");
  const f = raw as Record<string, unknown>;
  if (typeof f.text !== "string") fail("finding text");
  return {
    text: f.text,
    tier: toTier(f.tier, "finding"),
    affects: toStringArray(f.affects, "affects"),
    links: toStringArray(f.links, "links"),
    remediation: toRemediation(f.remediation),
  };
}

/** Parse `brew doctor --json` stdout. Throws ParseError on anything outside the documented shape. */
export function parseBrewDoctor(json: string): DoctorReport {
  if (json.trim() === "") throw new ParseError("brew doctor produced no output");

  let root: unknown;
  try {
    root = JSON.parse(json);
  } catch (err) {
    throw new ParseError("Unexpected brew doctor output", { cause: err as Error });
  }

  const { tier, findings } = (root ?? {}) as { tier?: unknown; findings?: unknown };
  if (!Array.isArray(findings)) fail("findings");

  return { tier: toTier(tier, "root"), findings: findings.map(toFinding) };
}

/** Section label: "Tier 1" | "Tier 2" | "Tier 3" | "Unsupported". */
export function tierLabel(tier: DoctorTier): string {
  return tier === "unsupported" ? "Unsupported" : `Tier ${tier}`;
}

/** One-line list title: the first non-empty line of `text`, trimmed. */
export function findingTitle(finding: DoctorFinding): string {
  return (
    finding.text
      .split("\n")
      .map((line) => line.trim())
      .find(Boolean) ?? ""
  );
}

/** The worst tier among the findings — Unsupported beats every integer. Tier 1 when there are none. */
export function worstTier(findings: DoctorFinding[]): DoctorTier {
  const rank = (t: DoctorTier) => (t === "unsupported" ? Number.MAX_SAFE_INTEGER : t);
  return findings.reduce<DoctorTier>((worst, f) => (rank(f.tier) > rank(worst) ? f.tier : worst), 1);
}

/**
 * Fence `content` in backticks, always one longer than the longest run inside it
 * (min 3), so brew text or a command containing a fence cannot break out.
 */
function fence(content: string, info = ""): string {
  const longest = Math.max(0, ...Array.from(content.matchAll(/`+/g), (m) => m[0].length));
  const ticks = "`".repeat(Math.max(3, longest + 1));
  return `${ticks}${info}\n${content}\n${ticks}`;
}

/**
 * Whether the remediation prose already lists every command on a line of its
 * own. Whole indentation-trimmed LINES, not substrings: "Run brew cleanup
 * --prune=all" mentions `brew cleanup` without being it, and hiding the command
 * block there would hide the command the user is meant to run.
 */
function listsEveryCommand(remediation: DoctorRemediation): boolean {
  const lines = new Set(remediation.text.split("\n").map((line) => line.trim()));
  return remediation.commands.every((command) => lines.has(command));
}

/**
 * The whole report as one Markdown document, in `report.findings` order —
 * brew serialises findings in check order (cmd/doctor.rb) and Fix All runs them
 * in that same order, so the document must not re-sort them. Each finding gets a
 * `### <first line> — Tier N` heading; the tier travels with the finding instead
 * of a grouping heading.
 *
 * brew's own wrapping and indentation carry meaning (a finding lists affected
 * paths one per indented line), so `text` goes in a fenced block verbatim —
 * never reflowed, and never escaped, because nothing inside a fence renders.
 * Only the heading and the link bullets sit outside a fence, so only they are
 * escaped.
 *
 * Empty string for a healthy system; the caller shows its own "ready to brew".
 */
export function doctorReportMarkdown(report: DoctorReport): string {
  const blocks: string[] = [];

  for (const finding of report.findings) {
    const label = tierLabel(finding.tier);
    const title = escapeMarkdown(findingTitle(finding));
    blocks.push(`### ${title ? `${title} — ${label}` : label}`);

    blocks.push(fence(finding.text.trimEnd()));

    // brew's remediation prose is pre-formatted ("To fix this, run:" then one
    // indented command per line), so it is fenced too — as prose it reflowed
    // into a run-on paragraph. Fenced, it already renders the commands, so the
    // separate sh block is emitted only when the text does not list them all.
    const remediation = finding.remediation;
    if (remediation?.text.trim()) blocks.push(fence(remediation.text.trimEnd()));
    if (remediation && remediation.commands.length > 0 && !listsEveryCommand(remediation)) {
      blocks.push(fence(remediation.commands.join("\n"), "sh"));
    }

    if (finding.links.length > 0) {
      blocks.push(finding.links.map((l) => `- [${escapeMarkdown(l)}](${l})`).join("\n"));
    }
  }

  return blocks.join("\n\n");
}
