import { APP_URL } from "./client";
import { Issue, IssueSeverity, IssueStatus, Overview, ReportWindow, Website, WebsiteSelector } from "./types";

export type RangeId = "today" | "7d" | "30d" | "90d";

export type MetricRow = {
  title: string;
  value: string;
};

const DAY_MS = 86_400_000;

export const RANGES: { id: RangeId; title: string; days: number }[] = [
  { id: "today", title: "Today", days: 0 },
  { id: "7d", title: "Last 7 Days", days: 7 },
  { id: "30d", title: "Last 30 Days", days: 30 },
  { id: "90d", title: "Last 90 Days", days: 90 },
];

export const ISSUE_STATUSES: IssueStatus[] = ["open", "in_progress", "resolved", "suspended"];

export const ISSUE_STATUS_LABELS: Record<IssueStatus, string> = {
  open: "Open",
  in_progress: "In Progress",
  resolved: "Resolved",
  suspended: "Suspended",
};

export const ISSUE_SEVERITY_LABELS: Record<IssueSeverity, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  critical: "Critical",
};

export const websiteKey = (website: Website): string => website.id ?? website.domain ?? "";

export const websiteName = (website: Website): string => website.domain ?? website.id ?? "Website";

export const websiteSelector = (website: Website): WebsiteSelector =>
  website.id ? { websiteId: website.id } : { domain: website.domain };

const withWebsite = (path: string, websiteId?: string): string =>
  `${APP_URL}${path}${websiteId ? `?websiteId=${encodeURIComponent(websiteId)}` : ""}`;

export const dashboardUrl = (website: Website): string => withWebsite("/dashboard", website.id);

export const issuesUrl = (website: Website): string => withWebsite("/issues", website.id);

export const issueUrl = (issue: Issue): string =>
  withWebsite(`/issues/${encodeURIComponent(issue.id)}`, issue.websiteId);

export function reportWindow(rangeId: RangeId, now: Date, timezone: string): ReportWindow {
  const range = RANGES.find(({ id }) => id === rangeId) ?? RANGES[1];
  const start =
    range.days === 0
      ? new Date(now.getFullYear(), now.getMonth(), now.getDate())
      : new Date(now.getTime() - range.days * DAY_MS);
  return { startAt: start.toISOString(), endAt: now.toISOString(), timezone };
}

export const formatCount = (value: number): string => new Intl.NumberFormat().format(value);

export const formatPercent = (value: number): string => `${value.toFixed(1)}%`;

export function formatDuration(totalSeconds: number): string {
  const seconds = Math.round(totalSeconds);
  const minutes = Math.floor(seconds / 60);
  return minutes > 0 ? `${minutes}m ${seconds % 60}s` : `${seconds}s`;
}

export function formatMoney(value: number, currency?: string): string {
  if (!currency) return value.toFixed(2);
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(value);
  } catch {
    return `${value.toFixed(2)} ${currency}`;
  }
}

export const formatDate = (value: string): string =>
  new Date(value).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });

export function overviewRows(overview: Overview | undefined, websiteCurrency?: string): MetricRow[] {
  if (!overview) return [];
  const currency = overview.currency ?? websiteCurrency;
  const rows: [string, string | undefined][] = [
    ["Visitors", overview.visitors === undefined ? undefined : formatCount(overview.visitors)],
    ["Sessions", overview.sessions === undefined ? undefined : formatCount(overview.sessions)],
    ["Bounce Rate", overview.bounceRate === undefined ? undefined : formatPercent(overview.bounceRate)],
    [
      "Average Session",
      overview.avgSessionDuration === undefined ? undefined : formatDuration(overview.avgSessionDuration),
    ],
    ["Revenue", overview.revenue === undefined ? undefined : formatMoney(overview.revenue, currency)],
    ["Conversion Rate", overview.conversionRate === undefined ? undefined : formatPercent(overview.conversionRate)],
  ];
  return rows.flatMap(([title, value]) => (value === undefined ? [] : [{ title, value }]));
}

const withoutRemoteImages = (text: string): string => text.replace(/!\[/g, "\\![");

export function issueMarkdown(issue: Issue): string {
  const steps = issue.stepsToReplicate?.map((step, index) => `${index + 1}. ${withoutRemoteImages(step)}`).join("\n");
  return [
    `# ${withoutRemoteImages(issue.title)}`,
    issue.description ? withoutRemoteImages(issue.description) : "",
    steps ? `## Steps to Reproduce\n\n${steps}` : "",
  ]
    .filter(Boolean)
    .join("\n\n");
}
