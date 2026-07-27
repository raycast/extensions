import { UsageWindow, WindowKind } from "../../core/models";

interface OAuthWindow {
  utilization?: number;
  resets_at?: string | null;
}

interface OAuthLimit {
  kind?: string;
  group?: string;
  percent?: number;
  resets_at?: string | null;
  scope?: { model?: { id?: string | null; display_name?: string | null } | null; surface?: string | null } | null;
  is_active?: boolean;
}

export interface ClaudeUsageResponse {
  five_hour?: OAuthWindow;
  seven_day?: OAuthWindow;
  limits?: OAuthLimit[];
}

function parseDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function clampPercent(value: number | undefined): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return Math.min(100, Math.max(0, value));
}

function describeScope(limit: OAuthLimit): string | null {
  const model = limit.scope?.model?.display_name?.trim();
  if (model) return model;
  const surface = limit.scope?.surface?.trim();
  return surface || null;
}

/**
 * `limits[]` is preferred over the flat `five_hour`/`seven_day` pair because it
 * additionally carries per-model scoped windows. The flat fields are used only
 * when `limits[]` is absent or yields nothing usable.
 */
export function parseClaudeUsage(response: ClaudeUsageResponse): UsageWindow[] {
  const fromLimits = parseLimits(response.limits ?? []);
  if (fromLimits.length > 0) return fromLimits;
  return parseFlatWindows(response);
}

function parseLimits(limits: OAuthLimit[]): UsageWindow[] {
  const windows: UsageWindow[] = [];
  const scopedSeen = new Map<string, number>();

  for (const limit of limits) {
    const percent = clampPercent(limit.percent);
    if (percent === null) continue;

    const kindRaw = (limit.kind ?? "").toLowerCase();
    const resetsAt = parseDate(limit.resets_at);

    if (kindRaw === "session") {
      windows.push({
        id: "session",
        label: "Session",
        kind: "session",
        usedPercent: percent,
        resetsAt,
        isPrimary: true,
      });
      continue;
    }

    if (kindRaw === "weekly_all") {
      windows.push({ id: "weekly", label: "Weekly", kind: "weekly", usedPercent: percent, resetsAt, isPrimary: true });
      continue;
    }

    if (kindRaw === "weekly_scoped") {
      const scope = describeScope(limit);
      if (!scope) continue;
      // Scopes are not guaranteed unique; disambiguate rather than silently collapse.
      const seen = scopedSeen.get(scope) ?? 0;
      scopedSeen.set(scope, seen + 1);
      const id = seen === 0 ? `weekly:${scope}` : `weekly:${scope}:${seen}`;
      windows.push({
        id,
        label: `Weekly · ${scope}`,
        kind: "scoped",
        usedPercent: percent,
        resetsAt,
        isPrimary: false,
      });
      continue;
    }

    // Unknown kinds still carry a real number, so surface them rather than drop them.
    if (kindRaw) {
      const group = (limit.group ?? "").toLowerCase();
      const kind: WindowKind = group === "session" ? "session" : group === "weekly" ? "weekly" : "scoped";
      windows.push({
        id: kindRaw,
        label: humanize(kindRaw),
        kind,
        usedPercent: percent,
        resetsAt,
        isPrimary: false,
      });
    }
  }

  return sortWindows(windows);
}

function parseFlatWindows(response: ClaudeUsageResponse): UsageWindow[] {
  const windows: UsageWindow[] = [];

  const session = clampPercent(response.five_hour?.utilization);
  if (session !== null) {
    windows.push({
      id: "session",
      label: "Session",
      kind: "session",
      usedPercent: session,
      resetsAt: parseDate(response.five_hour?.resets_at),
      isPrimary: true,
    });
  }

  const weekly = clampPercent(response.seven_day?.utilization);
  if (weekly !== null) {
    windows.push({
      id: "weekly",
      label: "Weekly",
      kind: "weekly",
      usedPercent: weekly,
      resetsAt: parseDate(response.seven_day?.resets_at),
      isPrimary: true,
    });
  }

  return windows;
}

function humanize(value: string): string {
  return value
    .split(/[_\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

const KIND_ORDER: Record<WindowKind, number> = { session: 0, weekly: 1, scoped: 2 };

export function sortWindows(windows: UsageWindow[]): UsageWindow[] {
  return [...windows].sort((a, b) => {
    if (a.isPrimary !== b.isPrimary) return a.isPrimary ? -1 : 1;
    if (KIND_ORDER[a.kind] !== KIND_ORDER[b.kind]) return KIND_ORDER[a.kind] - KIND_ORDER[b.kind];
    return b.usedPercent - a.usedPercent;
  });
}
