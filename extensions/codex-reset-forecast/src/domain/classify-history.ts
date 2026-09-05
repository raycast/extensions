import type { ForecastChange, ForecastDetail, ForecastHistoryEntry } from "../api/forecast-schema";

type HistoryKind = "confirmed-reset" | "announcement" | "ordinary";

const CONFIRMED_RESET_LABEL = "confirmed reset";
const RESET_ANNOUNCEMENT_LABEL = "public reset announcement";
const SOURCE_POST_KIND = "tweet";

function normalizedLabel(change: ForecastChange): string {
  return change.label.trim().toLocaleLowerCase("en-US");
}

function normalizedDetailValue(value: string | undefined): string {
  return value?.trim().toLocaleLowerCase("en-US") ?? "";
}

function changePriority(change: ForecastChange): number {
  const label = normalizedLabel(change);
  if (label === CONFIRMED_RESET_LABEL) return 4;
  if (label === RESET_ANNOUNCEMENT_LABEL) return 3;
  if (change.details?.length) return 2;
  return 1;
}

export function classifyHistoryEntry(entry: ForecastHistoryEntry): HistoryKind {
  const labels = entry.changes.map(normalizedLabel);
  if (labels.includes(CONFIRMED_RESET_LABEL)) return "confirmed-reset";
  if (labels.includes(RESET_ANNOUNCEMENT_LABEL)) return "announcement";
  return "ordinary";
}

export function getPrimaryChange(entry: ForecastHistoryEntry): ForecastChange | undefined {
  return entry.changes.reduce<ForecastChange | undefined>((best, change) => {
    if (!best || changePriority(change) > changePriority(best)) return change;
    return best;
  }, undefined);
}

export function getSourceDetail(entry: ForecastHistoryEntry): ForecastDetail | undefined {
  return entry.changes
    .flatMap((change) => change.details ?? [])
    .find((detail) => isSourcePostDetail(detail) && isSafeSourceUrl(detail.url));
}

export function isSourcePostDetail(detail: ForecastDetail): boolean {
  return hasSourcePostAction(detail) || normalizedDetailValue(detail.kind) === SOURCE_POST_KIND;
}

export function hasSourcePostAction(detail: ForecastDetail): boolean {
  return normalizedDetailValue(detail.action) === "source post";
}

export function isSafeSourceUrl(value: string | undefined): value is string {
  if (!value) return false;

  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

export function historyTitle(entry: ForecastHistoryEntry): string {
  const kind = classifyHistoryEntry(entry);
  if (kind === "confirmed-reset") return "Confirmed Reset";
  if (kind === "announcement") return "Reset Announced";

  const label = getPrimaryChange(entry)?.label.trim();
  if (!label) return "Forecast Updated";
  return label.charAt(0).toLocaleUpperCase("en-US") + label.slice(1);
}
