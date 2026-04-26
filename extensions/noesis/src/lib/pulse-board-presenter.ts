import {
  buildMenuBarTitle,
  buildPulseSubtitle,
  getPreferredInsight,
  getPulseModeLabel,
} from "./menu-bar-insights";
import {
  DashboardSnapshot,
  MenuBarInsightKind,
  MenuBarSnapshot,
} from "./types";

export function buildPulseBoardMarkdown(
  snapshot: MenuBarSnapshot | null,
  preferredKind: MenuBarInsightKind,
): string {
  if (!snapshot) {
    return [
      "# Pulse Board",
      "",
      "Loading cached pulse view...",
      "",
      "The menu bar insight cache has not been read yet.",
    ].join("\n");
  }

  const { dashboard, insights, syncError } = snapshot;
  const preferredInsight = getPreferredInsight(insights, preferredKind);
  const preferredModeLabel = getPulseModeLabel(preferredKind);
  const boardTitle = buildMenuBarTitle(
    dashboard,
    insights,
    preferredKind,
    syncError,
  );
  const boardSummary = buildPulseSubtitle(insights);
  const lines = [
    "# Pulse Board",
    "",
    "Current menu bar pulse content mirrored here for full inspection inside Raycast.",
    "",
    "## Active Title",
    "",
    `- Title mode: ${preferredModeLabel}`,
    `- Menu bar title: ${boardTitle}`,
    preferredInsight
      ? `- Driving insight: ${getPulseModeLabel(preferredInsight.kind)}`
      : null,
    preferredInsight?.title ? `- Full title: ${preferredInsight.title}` : null,
    preferredInsight?.subtitle
      ? `- Subtitle: ${preferredInsight.subtitle}`
      : null,
    preferredInsight?.summary
      ? `- Summary: ${preferredInsight.summary}`
      : getPreferredInsightPendingLine(preferredKind, dashboard),
    preferredInsight
      ? `- Cached: ${formatRelativeTime(preferredInsight.fetchedAt)} (${formatAbsoluteTime(preferredInsight.fetchedAt)})`
      : null,
    preferredInsight
      ? `- Refreshes in: ${formatTimeUntil(preferredInsight.refreshAfter)}`
      : null,
    "",
    ...buildInsightSection(
      "TCM Organ",
      [
        ["Organ", insights.vedicClock?.title],
        ["Window", insights.vedicClock?.subtitle],
        ["Focus", insights.vedicClock?.summary],
        [
          "Next refresh",
          insights.vedicClock?.refreshAfter
            ? formatTimeUntil(insights.vedicClock.refreshAfter)
            : undefined,
        ],
        [
          "Cached",
          insights.vedicClock?.fetchedAt
            ? `${formatRelativeTime(insights.vedicClock.fetchedAt)} (${formatAbsoluteTime(insights.vedicClock.fetchedAt)})`
            : undefined,
        ],
      ],
      getInsightUnavailableMessage("vedicClock", dashboard),
    ),
    "",
    ...buildInsightSection(
      "Biorhythm",
      [
        ["Biorhythm", insights.biorhythm?.title],
        ["Dominant", insights.biorhythm?.subtitle],
        ["Cycles", insights.biorhythm?.summary],
        [
          "Cached",
          insights.biorhythm?.fetchedAt
            ? `${formatRelativeTime(insights.biorhythm.fetchedAt)} (${formatAbsoluteTime(insights.biorhythm.fetchedAt)})`
            : undefined,
        ],
        [
          "Refreshes in",
          insights.biorhythm?.refreshAfter
            ? formatTimeUntil(insights.biorhythm.refreshAfter)
            : undefined,
        ],
      ],
      getInsightUnavailableMessage("biorhythm", dashboard),
    ),
    "",
    ...buildInsightSection(
      "Vimshottari",
      [
        ["Vimshottari", insights.vimshottari?.title],
        ["Next", insights.vimshottari?.subtitle],
        ["Dasha", insights.vimshottari?.summary],
        [
          "Cached",
          insights.vimshottari?.fetchedAt
            ? `${formatRelativeTime(insights.vimshottari.fetchedAt)} (${formatAbsoluteTime(insights.vimshottari.fetchedAt)})`
            : undefined,
        ],
        [
          "Refreshes in",
          insights.vimshottari?.refreshAfter
            ? formatTimeUntil(insights.vimshottari.refreshAfter)
            : undefined,
        ],
      ],
      getInsightUnavailableMessage("vimshottari", dashboard),
    ),
    "",
    "## Board Status",
    "",
    `- Cache state: ${dashboard.cacheState.toUpperCase()}`,
    dashboard.timestamps.lastSyncAt
      ? `- Last sync: ${formatRelativeTime(dashboard.timestamps.lastSyncAt)} (${formatAbsoluteTime(dashboard.timestamps.lastSyncAt)})`
      : "- Last sync: No dashboard sync timestamp stored yet",
    boardSummary
      ? `- Combined board: ${boardSummary}`
      : "- Combined board: Waiting for cached pulse summaries",
    dashboard.syncError ? `- Snapshot error: ${dashboard.syncError}` : null,
    syncError ? `- Pulse refresh error: ${syncError}` : null,
    ...buildIssueSection("Dashboard Issues", dashboard.syncIssues),
    ...buildIssueSection("Pulse Issues", snapshot.syncIssues),
  ];

  return compactMarkdown(lines).join("\n");
}

function buildIssueSection(
  title: string,
  issues: Array<{ resource: string; message: string; target: string }>,
): Array<string | null> {
  if (issues.length === 0) {
    return [];
  }

  return [
    "",
    `## ${title}`,
    "",
    ...issues.slice(0, 3).map((issue) => {
      const target = issue.target ? ` (${issue.target})` : "";
      return `- ${issue.resource}${target}: ${issue.message}`;
    }),
  ];
}

function buildInsightSection(
  title: string,
  rows: Array<[string, string | undefined]>,
  unavailableMessage: string,
): string[] {
  const lines = [`## ${title}`, ""];
  const visibleRows = rows.filter(
    ([, value]) => typeof value === "string" && value.trim().length > 0,
  ) as Array<[string, string]>;

  if (visibleRows.length === 0) {
    lines.push(`- ${unavailableMessage}`);
    return lines;
  }

  visibleRows.forEach(([label, value]) => {
    lines.push(`- ${label}: ${value}`);
  });

  return lines;
}

function getInsightUnavailableMessage(
  kind: MenuBarInsightKind,
  dashboard: DashboardSnapshot,
): string {
  if (!dashboard.hasCredentials && dashboard.source === "empty") {
    return "Connect the Selemene Engine API key to warm this pulse section.";
  }

  if (kind !== "vedicClock" && !dashboard.profile?.birthDate) {
    return `Add birth data in Profile to unlock ${getPulseModeLabel(kind).toLowerCase()} pulse.`;
  }

  return "Refresh Pulse Now to warm this pulse section.";
}

function getPreferredInsightPendingLine(
  preferredKind: MenuBarInsightKind,
  dashboard: DashboardSnapshot,
): string {
  if (!dashboard.hasCredentials && dashboard.source === "empty") {
    return "- Summary: Connect the Selemene Engine API key to warm the pulse board.";
  }

  if (preferredKind !== "vedicClock" && !dashboard.profile?.birthDate) {
    return `- Summary: Add birth data in Profile to unlock ${getPulseModeLabel(preferredKind).toLowerCase()} pulse.`;
  }

  return "- Summary: Refresh Pulse Now to surface the current menu bar insight.";
}

function compactMarkdown(lines: Array<string | null>): string[] {
  const compact: string[] = [];

  for (const line of lines) {
    if (line === null) {
      continue;
    }

    if (line === "" && compact[compact.length - 1] === "") {
      continue;
    }

    compact.push(line);
  }

  if (compact[compact.length - 1] === "") {
    compact.pop();
  }

  return compact;
}

function formatAbsoluteTime(value?: string): string {
  if (!value) {
    return "Unknown";
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

function formatRelativeTime(value?: string): string {
  if (!value) {
    return "Never";
  }

  const date = new Date(value);
  const diffMs = Date.now() - date.getTime();

  if (!Number.isFinite(diffMs)) {
    return value;
  }

  const seconds = Math.floor(diffMs / 1000);
  if (seconds < 60) {
    return `${seconds}s ago`;
  }

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return `${minutes}m ago`;
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours}h ago`;
  }

  const days = Math.floor(hours / 24);
  if (days < 30) {
    return `${days}d ago`;
  }

  return date.toLocaleString();
}

function formatTimeUntil(value?: string): string {
  if (!value) {
    return "Unknown";
  }

  const date = new Date(value);
  const diffMs = date.getTime() - Date.now();

  if (!Number.isFinite(diffMs)) {
    return value;
  }

  const totalSeconds = Math.max(0, Math.floor(diffMs / 1000));
  if (totalSeconds < 60) {
    return `${totalSeconds}s`;
  }

  const minutes = Math.floor(totalSeconds / 60);
  if (minutes < 60) {
    return `${minutes}m`;
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours}h ${minutes % 60}m`;
  }

  const days = Math.floor(hours / 24);
  return `${days}d ${hours % 24}h`;
}
