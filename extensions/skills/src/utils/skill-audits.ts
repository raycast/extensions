import { SKILLS_BASE_URL, type AuditProvider, type AuditStatus, type Skill, type SkillAudit } from "../shared";

export type SkillAuditsAvailability = "available" | "not-available" | "fetch-error" | "parse-error";

export type SkillAuditsResult = {
  audits: SkillAudit[];
  availability: SkillAuditsAvailability;
};

const PROVIDERS_BY_SLUG = {
  "agent-trust-hub": "agent-trust-hub",
  socket: "socket",
  snyk: "snyk",
} as const;

const PROVIDER_ORDER: AuditProvider[] = ["agent-trust-hub", "socket", "snyk"];

/**
 * Normalizes the URL of an audit entry.
 *
 * @param href - The URL of an audit entry.
 * @returns The normalized URL of the audit entry.
 */
function normalizeSecurityAuditUrl(href: string): string | undefined {
  if (href.startsWith("https://") || href.startsWith("http://")) {
    return href;
  }
  if (href.startsWith("/")) {
    return `${SKILLS_BASE_URL}${href}`;
  }
  return undefined;
}

/**
 * Parses the status of a security audit from the HTML of an audit entry.
 *
 * @param entryHtml - The HTML of an audit entry.
 * @returns The status of the security audit.
 */
function parseAuditStatusFromEntryHtml(entryHtml: string): AuditStatus {
  const auditStatus = entryHtml.match(/\b(Pass|Warn|Fail)\b/i)?.[1]?.toLowerCase();
  if (auditStatus === "pass") return "pass";
  if (auditStatus === "warn") return "warn";
  if (auditStatus === "fail") return "fail";
  return "unknown";
}

/**
 * Extracts the main content from the HTML content of a page.
 *
 * @param html - The HTML to extract the main content from.
 * @returns The main content of the HTML.
 */
function extractMainContentFromHtml(html: string): string | undefined {
  const lower = html.toLowerCase();
  const mainStart = lower.indexOf("<main");
  if (mainStart < 0) return undefined;

  const contentStart = lower.indexOf(">", mainStart);
  if (contentStart < 0) return undefined;

  const mainEnd = lower.indexOf("</main>", contentStart);
  if (mainEnd < 0) return undefined;

  return html.slice(contentStart + 1, mainEnd);
}

/**
 * Extracts the security audit section from the HTML content of the skill's details page.
 *
 * @param mainHtml - The HTML of the skill's details page.
 * @returns The security audit section of the HTML of the skill's details page.
 */
function extractSecurityAuditSection(mainHtml: string): string | undefined {
  const lower = mainHtml.toLowerCase();
  const start = lower.indexOf("security audits");
  if (start < 0) return undefined;

  const after = mainHtml.slice(start);
  const afterLower = lower.slice(start);
  const installedOn = afterLower.indexOf("installed on");
  return installedOn >= 0 ? after.slice(0, installedOn) : after;
}

/**
 * Parses the security audits from the HTML of the skill's details page.
 *
 * @param html - The HTML of the skill's details page.
 * @returns The security audits from the HTML of the skill's details page.
 */
function parseSecurityAuditsFromHtml(html: string): SkillAuditsResult {
  const mainContent = extractMainContentFromHtml(html);
  if (!mainContent) {
    return { audits: [], availability: "parse-error" };
  }

  const sectionHtml = extractSecurityAuditSection(mainContent);
  if (!sectionHtml) {
    return { audits: [], availability: "not-available" };
  }

  const auditsByProvider = new Map<AuditProvider, SkillAudit>();
  const auditEntryAnchorPattern = /<a[^>]*href="([^"]*\/security\/([^"/?#]+)[^"]*)"[^>]*>([\s\S]*?)<\/a>/gi;

  for (const match of sectionHtml.matchAll(auditEntryAnchorPattern)) {
    const href = match[1];
    const slug = match[2].toLowerCase();
    const entryHtml = match[3];
    const provider = PROVIDERS_BY_SLUG[slug as keyof typeof PROVIDERS_BY_SLUG];

    if (!provider) continue;

    const status = parseAuditStatusFromEntryHtml(entryHtml);
    auditsByProvider.set(provider, {
      provider,
      status,
      url: normalizeSecurityAuditUrl(href),
    });
  }

  const audits = PROVIDER_ORDER.map((provider) => auditsByProvider.get(provider)).filter((audit): audit is SkillAudit =>
    Boolean(audit),
  );

  if (audits.length > 0) {
    return { audits, availability: "available" };
  }

  const hasSecurityLinks = /<a[^>]*href="[^"]*\/security\/[^"]*"[^>]*>/i.test(sectionHtml);
  return {
    audits: [],
    availability: hasSecurityLinks ? "parse-error" : "not-available",
  };
}

/**
 * Fetches the security audits for a skill from the Skills website.
 *
 * @param skill - The skill to fetch the security audits for.
 * @returns The security audits for the skill.
 */
export async function fetchSkillAudits(skill: Skill): Promise<SkillAuditsResult> {
  const detailUrl = `${SKILLS_BASE_URL}/${skill.source}/${skill.skillId}`;
  const timeoutSignal = typeof AbortSignal.timeout === "function" ? AbortSignal.timeout(10_000) : undefined;

  let response: Response;
  try {
    response = await fetch(detailUrl, { signal: timeoutSignal });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[skills-audit] Failed to fetch ${skill.source}/${skill.skillId}: ${message}`);
    return { audits: [], availability: "fetch-error" };
  }

  if (!response.ok) {
    console.error(`[skills-audit] Failed to fetch ${skill.source}/${skill.skillId}: HTTP ${response.status}`);
    return { audits: [], availability: "fetch-error" };
  }

  return parseSecurityAuditsFromHtml(await response.text());
}
