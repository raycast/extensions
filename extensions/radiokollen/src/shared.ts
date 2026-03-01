import {
  formatIsoToStockholm,
  shiftDateRange,
  toDateInputValue,
  type MatchMode,
  type SearchPipelineResult,
  type SearchQuery,
  type SongGroup,
} from "@filipkillander/radiokollen-sdk";

export type SearchPreset = "24h" | "7d" | "31d";

const MATCH_MODE_LABELS: Record<MatchMode, string> = {
  broad: "Bred",
  exact: "Exakt",
};

export function createDefaultQuery(now: Date = new Date()): SearchQuery {
  const fromDate = addDays(now, -6);

  return {
    artist: "",
    label: "",
    title: "",
    fromDate: toDateInputValue(fromDate),
    toDate: toDateInputValue(now),
    matchMode: "broad",
  };
}

export function toPresetDates(
  preset: SearchPreset,
  now: Date = new Date(),
): { fromDate: Date; toDate: Date } {
  const daysBack = preset === "24h" ? 1 : preset === "7d" ? 6 : 30;

  return {
    fromDate: addDays(now, -daysBack),
    toDate: now,
  };
}

export function parseIsoDateToLocalDate(isoDate: string): Date {
  const [year, month, day] = isoDate.split("-").map(Number);
  return new Date(year, month - 1, day, 12, 0, 0, 0);
}

export function toMatchModeLabel(matchMode: MatchMode): string {
  return MATCH_MODE_LABELS[matchMode];
}

export function canSearchNextPeriod(
  query: SearchQuery,
  now: Date = new Date(),
): boolean {
  return query.toDate < toDateInputValue(now);
}

export function shiftQueryPeriod(
  query: SearchQuery,
  direction: "previous" | "next",
): SearchQuery {
  const shifted = shiftDateRange(query.fromDate, query.toDate, direction);

  return {
    ...query,
    ...shifted,
  };
}

export function queryToSummary(query: SearchQuery): string {
  const filters = [
    query.artist ? `artist: ${query.artist}` : null,
    query.label ? `label: ${query.label}` : null,
    query.title ? `titel: ${query.title}` : null,
  ].filter(Boolean);

  const filterText = filters.length ? filters.join(" · ") : "inga filter";

  return `${query.fromDate} → ${query.toDate} · ${toMatchModeLabel(query.matchMode)} · ${filterText}`;
}

export function buildResultSummaryMarkdown(
  result: SearchPipelineResult,
): string {
  const statusText =
    result.totalPlays > 0
      ? "Spelad inom valt intervall"
      : "Inte spelad inom valt intervall";

  return [
    "# Radiokollen",
    "",
    `**Status:** ${statusText}`,
    `**Intervall:** ${result.query.fromDate} till ${result.query.toDate}`,
    `**Matchning:** ${toMatchModeLabel(result.query.matchMode)}`,
    `**Unika låtar:** ${result.totalSongs}`,
    `**Spelningar:** ${result.totalPlays}`,
    "",
    "## Aktiva filter",
    `- Artist: ${result.query.artist || "(saknas)"}`,
    `- Label: ${result.query.label || "(saknas)"}`,
    `- Låttitel: ${result.query.title || "(saknas)"}`,
  ].join("\n");
}

export function buildGroupDetailMarkdown(group: SongGroup): string {
  const labels = group.labels.length ? group.labels.join(", ") : "(okänd)";

  return [
    `# ${group.artist} - ${group.title}`,
    "",
    `**Labels:** ${labels}`,
    `**Spelningar:** ${group.plays.length}`,
    "",
    "## Sändningar",
    ...group.plays.map(
      (play) =>
        `- ${formatIsoToStockholm(play.startedAt)} · ${play.channelName}`,
    ),
  ].join("\n");
}

export function formatHistoryTimestamp(isoTimestamp: string): string {
  return new Intl.DateTimeFormat("sv-SE", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(isoTimestamp));
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}
