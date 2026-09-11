import {
  API_BASE_URL,
  SKILLS_BASE_URL,
  buildSkillUrl,
  buildGithubIssueUrl,
  type AuditStatus,
  type Skill,
  type SkillAudit,
} from "../shared";

export type SkillAuditsAvailabilityState = "available" | "not-available" | "fetch-error" | "parse-error";

export type SkillAuditErrorKind = "parse" | "network" | "http" | "body-read";

export type SkillAuditErrorDetails = {
  kind: SkillAuditErrorKind;
  title: "Unable to fetch security audits data" | "Unable to parse security audits data";
  message: string;
  skillSource: string;
  skillId: string;
  detailUrl: string;
  timestamp: string;
};

export type SkillAuditsResult = {
  audits: SkillAudit[];
  availabilityState: SkillAuditsAvailabilityState;
  errorDetails?: SkillAuditErrorDetails;
};

function buildAuditErrorResult({
  skill,
  kind,
  title,
  message,
}: {
  skill: Skill;
  kind: SkillAuditErrorKind;
  title: SkillAuditErrorDetails["title"];
  message: string;
}): SkillAuditsResult {
  return {
    audits: [],
    availabilityState: kind === "parse" ? "parse-error" : "fetch-error",
    errorDetails: {
      kind,
      title,
      message,
      skillSource: skill.source,
      skillId: skill.skillId,
      detailUrl: buildSkillUrl(skill),
      timestamp: new Date().toISOString(),
    },
  };
}

function buildAuditFetchErrorResult({
  skill,
  kind,
  message,
}: {
  skill: Skill;
  kind: Exclude<SkillAuditErrorKind, "parse">;
  message: string;
}): SkillAuditsResult {
  return buildAuditErrorResult({ skill, kind, title: "Unable to fetch security audits data", message });
}

function buildAuditParseErrorResult(skill: Skill, message: string): SkillAuditsResult {
  return buildAuditErrorResult({ skill, kind: "parse", title: "Unable to parse security audits data", message });
}

export function formatSkillAuditErrorDetails({
  skillName,
  errorDetails,
}: {
  skillName: string;
  errorDetails: SkillAuditErrorDetails;
}): string {
  return [
    errorDetails.title,
    `Skill: ${skillName}`,
    `Source: ${errorDetails.skillSource}/${errorDetails.skillId}`,
    `Failure kind: ${errorDetails.kind}`,
    `Message: ${errorDetails.message}`,
    `URL: ${errorDetails.detailUrl}`,
    `Time: ${errorDetails.timestamp}`,
  ].join("\n");
}

export function buildSecurityAuditGitHubIssueUrl({
  error,
  errorDetails,
  skillName,
}: {
  error: Error;
  errorDetails: SkillAuditErrorDetails;
  skillName: string;
}): string {
  return buildGithubIssueUrl({
    title: `${errorDetails.title}: ${skillName}`,
    description: `Failed to verify the security audit data for skill: ${skillName}\n\nAudit Error Details:\n\n\`\`\`\n${formatSkillAuditErrorDetails({ skillName, errorDetails })}\n\`\`\`\n`,
    error,
    reproductionSteps: [
      "Open Raycast and run the 'Search Skills' command.",
      "Wait for the security audits to load in the details view of the skill.",
      "Observe the resulting error.",
    ],
  });
}

function parseAuditStatus(value: unknown): AuditStatus {
  const auditStatus = typeof value === "string" ? value.toLowerCase() : undefined;
  if (auditStatus === "pass") return "pass";
  if (auditStatus === "warn") return "warn";
  if (auditStatus === "fail") return "fail";
  return "unknown";
}

function encodePath(value: string): string {
  return value.split("/").map(encodeURIComponent).join("/");
}

function buildSkillAuditApiUrl(skill: Skill): string {
  return `${API_BASE_URL}/v1/skills/audit/${encodePath(skill.source)}/${encodeURIComponent(skill.skillId)}`;
}

function buildSecurityAuditUrl(skill: Skill, provider: string): string {
  return `${buildSkillUrl(skill)}/security/${encodeURIComponent(provider)}`;
}

function normalizeSecurityAuditUrl(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  if (value.startsWith("https://") || value.startsWith("http://")) return value;
  if (value.startsWith("/")) return `${SKILLS_BASE_URL}${value}`;
  return undefined;
}

function slugifyProviderLabel(label: string): string {
  return label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

type SkillAuditApiEntry = {
  auditUrl?: unknown;
  href?: unknown;
  provider?: unknown;
  slug?: unknown;
  status?: unknown;
  url?: unknown;
};

type SkillAuditApiResponse = {
  audits?: unknown;
};

function parseSkillAuditApiEntry(skill: Skill, entry: SkillAuditApiEntry): SkillAudit | undefined {
  const providerLabelValue = typeof entry.provider === "string" ? entry.provider.trim() : "";
  const providerLabel = providerLabelValue || undefined;
  const slugValue = typeof entry.slug === "string" ? entry.slug.trim().toLowerCase() : "";
  const slug = slugValue || undefined;
  const provider = slug || (providerLabel ? slugifyProviderLabel(providerLabel) : undefined);

  if (!provider) return undefined;

  return {
    provider,
    providerLabel,
    status: parseAuditStatus(entry.status),
    url:
      normalizeSecurityAuditUrl(entry.url) ??
      normalizeSecurityAuditUrl(entry.href) ??
      normalizeSecurityAuditUrl(entry.auditUrl) ??
      buildSecurityAuditUrl(skill, provider),
  };
}

/**
 * Parses the security audits from the Skills audit API.
 *
 * @param body - The JSON body from the Skills audit API.
 * @returns The security audits from the Skills audit API.
 */
function parseSecurityAuditsFromApi(skill: Skill, body: SkillAuditApiResponse): SkillAuditsResult {
  if (!Array.isArray(body.audits)) {
    return buildAuditParseErrorResult(skill, "The security audit API response did not include an audits array.");
  }

  try {
    const parsedAudits: SkillAudit[] = [];
    for (const entry of body.audits) {
      if (!entry || typeof entry !== "object") continue;

      const audit = parseSkillAuditApiEntry(skill, entry as SkillAuditApiEntry);
      if (!audit) continue;

      const existingAuditIndex = parsedAudits.findIndex((existingAudit) => existingAudit.provider === audit.provider);
      if (existingAuditIndex >= 0) {
        parsedAudits[existingAuditIndex] = audit;
      } else {
        parsedAudits.push(audit);
      }
    }

    return {
      audits: parsedAudits,
      availabilityState: parsedAudits.length > 0 ? "available" : "not-available",
      errorDetails: undefined,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return buildAuditParseErrorResult(skill, `Extraction failed: ${message}`);
  }
}

/**
 * Fetches the security audits for a skill from the Skills audit API.
 *
 * @param skill - The skill to fetch the security audits for.
 * @returns The security audits for the skill.
 */
export async function fetchSkillAudits(skill: Skill): Promise<SkillAuditsResult> {
  const auditApiUrl = buildSkillAuditApiUrl(skill);
  const timeoutSignal = typeof AbortSignal.timeout === "function" ? AbortSignal.timeout(10_000) : undefined;

  let response: Response;
  try {
    response = await fetch(auditApiUrl, { signal: timeoutSignal });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return buildAuditFetchErrorResult({
      skill,
      kind: "network",
      message,
    });
  }

  if (!response.ok) {
    return buildAuditFetchErrorResult({
      skill,
      kind: "http",
      message: `HTTP ${response.status}`,
    });
  }

  let body: SkillAuditApiResponse;
  try {
    body = (await response.json()) as SkillAuditApiResponse;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return buildAuditFetchErrorResult({
      skill,
      kind: "body-read",
      message,
    });
  }

  return parseSecurityAuditsFromApi(skill, body);
}
