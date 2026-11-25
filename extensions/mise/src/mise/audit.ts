import { isRecord, isStringArray, miseJson, MiseOutputError } from "./exec";
import type { MiseLocation } from "./locate";
import { compareVersions } from "./version";

// mise 2026.11.12 added `mise audit` and `mise upgrade --vulnerable`.
export const AUDIT_SINCE = "2026.11.12";

export type Severity = "low" | "medium" | "high" | "critical";

const SEVERITIES: Severity[] = ["low", "medium", "high", "critical"];

export type Advisory = {
  id: string;
  aliases: string[];
  // mise reports null when the advisory has no severity.
  severity?: Severity;
  summary: string;
  // Often empty: an advisory can name its fixes only as commits.
  fixed: string[];
  url?: string;
};

// One installed version of a tool, with every advisory that affects it.
export type VulnerableTool = {
  tool: string;
  version: string;
  advisories: Advisory[];
  severity?: Severity;
};

// `unchecked` lists the versions mise has no advisory source for, such as most core tools; it isn't shown.
export function parseAudit(raw: unknown): VulnerableTool[] {
  if (!isRecord(raw) || !Array.isArray(raw.vulnerabilities)) {
    throw new MiseOutputError("mise audit: expected a vulnerabilities list", JSON.stringify(raw));
  }
  const byVersion = new Map<string, VulnerableTool>();
  for (const entry of raw.vulnerabilities) {
    if (!isRecord(entry) || typeof entry.tool !== "string" || typeof entry.version !== "string") {
      console.error("mise audit: advisory is malformed", JSON.stringify(entry));
      continue;
    }
    const key = `${entry.tool}@${entry.version}`;
    let tool = byVersion.get(key);
    if (!tool) byVersion.set(key, (tool = { tool: entry.tool, version: entry.version, advisories: [] }));
    const advisory = parseAdvisory(entry);
    tool.advisories.push(advisory);
    tool.severity = highest(tool.severity, advisory.severity);
  }
  return [...byVersion.values()];
}

// A field that is missing or the wrong shape falls back to empty, so one bad field costs only that
// field and the tool stays listed.
function parseAdvisory(entry: Record<string, unknown>): Advisory {
  const advisory: Advisory = {
    id: typeof entry.id === "string" ? entry.id : "unknown",
    aliases: isStringArray(entry.aliases) ? entry.aliases : [],
    summary: typeof entry.summary === "string" ? entry.summary : "",
    fixed: isStringArray(entry.fixed) ? entry.fixed : [],
  };
  const severity = SEVERITIES.find((known) => known === entry.severity);
  if (severity) advisory.severity = severity;
  if (typeof entry.url === "string") advisory.url = entry.url;
  return advisory;
}

function highest(a: Severity | undefined, b: Severity | undefined): Severity | undefined {
  const rank = (severity: Severity | undefined) => (severity ? SEVERITIES.indexOf(severity) : -1);
  return rank(b) > rank(a) ? b : a;
}

export function severityName(severity: Severity | undefined): string {
  return severity ?? "unknown";
}

const PLAIN_VERSION = /^\d+(\.\d+)*$/;

// The first release that fixes every advisory: for each, the lowest listed fix above the installed
// version, then the highest of those. An advisory may list one fix per release line, or name its fix
// only as a commit, and then no release can be named.
export function fixedVersion({
  version,
  advisories,
}: Pick<VulnerableTool, "version" | "advisories">): string | undefined {
  if (!PLAIN_VERSION.test(version) || advisories.length === 0) return undefined;
  const fixes: string[] = [];
  for (const { fixed } of advisories) {
    const fix = fixed
      .filter((candidate) => PLAIN_VERSION.test(candidate) && compareVersions(candidate, version) > 0)
      .sort(compareVersions)[0];
    if (!fix) return undefined;
    fixes.push(fix);
  }
  return fixes.sort(compareVersions).at(-1);
}

// `mise audit` exits 1 when it finds advisories, with the report on stdout all the same.
export function listVulnerabilities(location: MiseLocation): Promise<VulnerableTool[]> {
  return miseJson(location, ["audit"], parseAudit, { okCodes: [1] });
}
