import { get } from "node:https";
import { URL, URLSearchParams } from "node:url";

const API_URL = "https://is-agentic.com/api/v1/report";
const REQUEST_TIMEOUT_MS = 15_000;

export type Tier = "essential" | "recommended" | "bonus";
export type IssueResult = "failed" | "partial";

export interface ScoreBucket {
  earned: number;
  available: number;
  passing: number;
  total: number;
}

export interface Issue {
  id: string;
  name: string;
  tier: Tier;
  result: IssueResult;
  details: string | null;
  recommendation: string | null;
}

export interface Report {
  target: string;
  display_target: string;
  report_url: string;
  score: number | null;
  score_label: string;
  scanned_at: string;
  eligible_checks: number;
  score_breakdown: {
    essential: ScoreBucket;
    recommended: ScoreBucket;
    bonus: { points: number; positive_signals: number };
  };
  issues: Issue[];
}

interface ProblemDetails {
  code?: string;
  detail?: string;
  resolution?: string;
  title?: string;
}

export class IsAgenticError extends Error {
  constructor(
    message: string,
    readonly code?: string,
    readonly resolution?: string,
  ) {
    super(message);
  }
}

export function normalizeUrl(value: string): string {
  const candidate = value.trim();
  if (!candidate) return "";

  const url = new URL(/^https?:\/\//i.test(candidate) ? candidate : `https://${candidate}`);
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new IsAgenticError("Enter a public HTTP or HTTPS URL.");
  }
  return url.toString();
}

async function request(url: string): Promise<{ statusCode: number; body: string }> {
  return new Promise((resolve, reject) => {
    let settled = false;
    const finish = <T>(callback: (value: T) => void, value: T) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      callback(value);
    };
    const request = get(`${API_URL}?${new URLSearchParams({ url })}`, (response) => {
      const chunks: Buffer[] = [];
      response.on("data", (chunk: Buffer) => chunks.push(chunk));
      response.once("aborted", () =>
        finish(
          reject,
          new IsAgenticError("Is Agentic ended the response before the report was complete. Please try again."),
        ),
      );
      response.once("error", (error) => finish(reject, error));
      response.once("end", () =>
        finish(resolve, { statusCode: response.statusCode ?? 500, body: Buffer.concat(chunks).toString("utf8") }),
      );
    });
    const timeout = setTimeout(() => {
      const error = new IsAgenticError("Is Agentic took too long to respond. Please try again.");
      request.destroy(error);
      finish(reject, error);
    }, REQUEST_TIMEOUT_MS);
    request.once("error", (error) => finish(reject, error));
  });
}

export async function getReport(url: string): Promise<Report> {
  const response = await request(url);
  let payload: Report | ProblemDetails;

  try {
    payload = JSON.parse(response.body) as Report | ProblemDetails;
  } catch {
    throw new IsAgenticError("Is Agentic returned an unexpected response. Please try again.");
  }

  if (response.statusCode >= 200 && response.statusCode < 300) return payload as Report;

  const problem = payload as ProblemDetails;
  throw new IsAgenticError(
    problem.detail ?? problem.title ?? "Is Agentic could not retrieve this report.",
    problem.code,
    problem.resolution,
  );
}

export function tierTitle(tier: Tier): string {
  return tier.charAt(0).toUpperCase() + tier.slice(1);
}

export function reportMarkdown(report: Report): string {
  const score = report.score === null ? "Unavailable" : `${report.score}/100`;
  const bucket = (label: string, value: ScoreBucket) =>
    `- **${label}:** ${value.earned}/${value.available} (${value.passing}/${value.total} checks passing)`;
  return `# ${report.display_target}\n\n## ${score}\n${report.score_label}\n\nLast scanned ${new Date(report.scanned_at).toLocaleString()}.\n\n${bucket("Essential", report.score_breakdown.essential)}\n${bucket("Recommended", report.score_breakdown.recommended)}\n- **Bonus:** ${report.score_breakdown.bonus.points} points from ${report.score_breakdown.bonus.positive_signals} positive signals\n\n${report.issues.length === 0 ? "## No outstanding issues\nThis report has no failed or partial checks." : `## ${report.issues.length} issue${report.issues.length === 1 ? "" : "s"}\nSelect an issue for evidence and a recommendation.`}`;
}

export function reportSummary(report: Report) {
  return {
    url: report.target,
    score: report.score,
    scoreLabel: report.score_label,
    scannedAt: report.scanned_at,
    reportUrl: report.report_url,
    eligibleChecks: report.eligible_checks,
    breakdown: report.score_breakdown,
    issues: report.issues.map((issue) => ({
      name: issue.name,
      tier: issue.tier,
      result: issue.result,
      evidence: issue.details,
      recommendation: issue.recommendation,
    })),
  };
}
