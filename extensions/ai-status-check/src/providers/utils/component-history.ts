import type { ComponentHistory, ComponentHistoryDay, ComponentHistoryLevel, Health } from "../../domain/types";

const LEVEL_SEVERITY: Readonly<Record<ComponentHistoryLevel, number>> = {
  not_monitored: -1,
  operational: 0,
  unknown: 1,
  informational: 2,
  maintenance: 3,
  degraded: 4,
  partial_outage: 5,
  major_outage: 6,
};

export function historyLevelFromHealth(health: Health): ComponentHistoryLevel {
  switch (health) {
    case "operational":
      return "operational";
    case "degraded":
      return "degraded";
    case "partial_outage":
      return "partial_outage";
    case "major_outage":
      return "major_outage";
    case "maintenance":
      return "maintenance";
    case "unknown":
      return "unknown";
  }
}

export function historyWindow(
  windowDays: number,
  now: Date,
  defaultLevel: ComponentHistoryLevel = "operational",
): ComponentHistoryDay[] {
  const end = startOfUtcDay(now);
  return Array.from({ length: windowDays }, (_, index) => {
    const date = new Date(end);
    date.setUTCDate(end.getUTCDate() - (windowDays - 1 - index));
    return { date: dateKey(date), level: defaultLevel };
  });
}

export function applyHistoryRange(
  days: ComponentHistoryDay[],
  startAt: string | Date,
  endAt: string | Date,
  level: ComponentHistoryLevel,
): void {
  const start = parsedDate(startAt);
  const end = parsedDate(endAt);
  if (!start || !end || end < start) return;

  const first = dateKey(start);
  const last = dateKey(end);
  for (const day of days) {
    if (day.date < first || day.date > last) continue;
    if (LEVEL_SEVERITY[level] > LEVEL_SEVERITY[day.level]) day.level = level;
  }
}

export function markBeforeMonitoredSince(days: ComponentHistoryDay[], monitoredSince: string | undefined): void {
  const parsed = monitoredSince ? parsedDate(monitoredSince) : undefined;
  if (!parsed) return;
  const firstMonitoredDate = dateKey(parsed);
  for (const day of days) {
    if (day.date < firstMonitoredDate) day.level = "not_monitored";
  }
}

export function componentHistory(
  basis: ComponentHistory["basis"],
  days: ComponentHistoryDay[],
  options: Pick<ComponentHistory, "uptimePercent" | "uptimeText" | "monitoredSince"> = {},
): ComponentHistory | undefined {
  if (days.length === 0) return undefined;
  const uptimePercent = finitePercent(options.uptimePercent);
  const uptimeText = uptimePercent === undefined ? undefined : publishedPercentText(options.uptimeText);
  const monitoredSinceDate = options.monitoredSince ? parsedDate(options.monitoredSince) : undefined;
  const monitoredSince = monitoredSinceDate ? dateKey(monitoredSinceDate) : undefined;
  return {
    basis,
    windowDays: days.length,
    days,
    ...(uptimePercent === undefined ? {} : { uptimePercent }),
    ...(uptimeText ? { uptimeText } : {}),
    ...(monitoredSince ? { monitoredSince } : {}),
  };
}

export function finitePercent(value: unknown): number | undefined {
  const number = typeof value === "number" ? value : typeof value === "string" ? Number.parseFloat(value) : Number.NaN;
  return Number.isFinite(number) && number >= 0 && number <= 100 ? number : undefined;
}

export function publishedPercentText(value: unknown): string | undefined {
  if (typeof value !== "string" && typeof value !== "number") return undefined;
  const text = String(value).trim().replace(/\s*%$/, "");
  return finitePercent(text) === undefined ? undefined : `${text}%`;
}

export function dateKey(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function startOfUtcDay(value: Date): Date {
  const date = new Date(value);
  date.setUTCHours(0, 0, 0, 0);
  return date;
}

function parsedDate(value: string | Date): Date | undefined {
  const date = value instanceof Date ? new Date(value) : new Date(value);
  return Number.isFinite(date.getTime()) ? startOfUtcDay(date) : undefined;
}
