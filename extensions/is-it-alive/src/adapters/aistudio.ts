import type {
  ComponentStatus,
  ComponentStatusValue,
  DayStatus,
  StatusAdapter,
  StatusIncident,
  StatusIndicator,
  StatusSnapshot,
} from "@/types";
import { normalizeSiteUrl } from "@/lib/url";
import { overallDescription } from "@/lib/snapshot-text";
import { buildPageHistoryFromComponents } from "@/lib/uptime-chart";
import {
  AI_STUDIO_STATE_NAMES,
  AI_STUDIO_STATE_RESOLVED,
  AiStudioIncidentTuple,
  AiStudioIncidentsResponse,
} from "@/types/aistudio";

const AI_STUDIO_HOST = "aistudio.google.com";
const STATUS_PAGE = "https://aistudio.google.com/status";
const INCIDENTS_RPC =
  "https://alkalimakersuite-pa.clients6.google.com/$rpc/google.internal.alkali.applications.makersuite.v1.MakerSuiteService/ListIncidentsHistory";
const HISTORY_DAYS = 90;

/**
 * Product ids used by the incident feed. Inferred from incident titles
 * (e.g. product [2, 3] on "AI Studio Realtime and Gemini Live API outage").
 */
const PRODUCT_NAMES: Record<number, string> = {
  1: "Gemini API",
  2: "Gemini Live API",
  3: "Google AI Studio",
};

/**
 * The RPC requires a browser API key. The status page embeds its (public,
 * referrer-restricted) keys in the HTML; we extract them instead of
 * hardcoding, since Google rotates them with deployments.
 */
async function fetchPageApiKeys(): Promise<string[]> {
  const response = await fetch(STATUS_PAGE, {
    headers: { Accept: "text/html" },
  });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  const html = await response.text();
  return [...new Set(html.match(/AIza[0-9A-Za-z_-]{30,40}/g) ?? [])];
}

async function fetchIncidents(): Promise<AiStudioIncidentTuple[]> {
  const keys = await fetchPageApiKeys();
  if (keys.length === 0) {
    throw new Error("Could not find an API key on the AI Studio status page");
  }

  // Some embedded keys are blocked for this RPC; try each until one works.
  let lastError = "RPC failed";
  for (const key of keys) {
    const response = await fetch(INCIDENTS_RPC, {
      method: "POST",
      headers: {
        "Content-Type": "application/json+protobuf",
        "X-Goog-Api-Key": key,
        Referer: `https://${AI_STUDIO_HOST}/`,
      },
      body: "[]",
    });

    if (response.ok) {
      const data = (await response.json()) as AiStudioIncidentsResponse;
      return data?.[0]?.[0] ?? [];
    }
    lastError = `HTTP ${response.status}`;
  }

  throw new Error(lastError);
}

function updates(incident: AiStudioIncidentTuple) {
  return incident[3] ?? [];
}

function productIds(incident: AiStudioIncidentTuple): number[] {
  return incident[5] ?? [];
}

function updateEpochMs(update: { 2: [string] }): number {
  return Number(update[2][0]) * 1000;
}

function isResolved(incident: AiStudioIncidentTuple): boolean {
  const last = updates(incident).at(-1);
  return last !== undefined && last[0] === AI_STUDIO_STATE_RESOLVED;
}

function incidentWindow(incident: AiStudioIncidentTuple): {
  start: Date;
  end: Date;
} {
  const all = updates(incident);
  const start = all.length ? new Date(updateEpochMs(all[0])) : new Date();
  const end =
    isResolved(incident) && all.length
      ? new Date(updateEpochMs(all[all.length - 1]))
      : new Date();
  return { start, end };
}

/** Severity field: 1 = degraded/issues, 2 = outage. */
function severityToComponentStatus(severity: number): ComponentStatusValue {
  return severity === 2 ? "major_outage" : "degraded_performance";
}

function severityToDayLevel(severity: number): DayStatus["level"] {
  return severity === 2 ? "major" : "degraded";
}

function severityToIndicator(severity: number): StatusIndicator {
  return severity === 2 ? "critical" : "minor";
}

const DAY_LEVEL_SEVERITY: Record<DayStatus["level"], number> = {
  operational: 0,
  unknown: 0,
  degraded: 1,
  partial: 2,
  major: 3,
};

function buildProductHistory(
  productId: number,
  incidents: AiStudioIncidentTuple[],
): DayStatus[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const dayMap = new Map<string, DayStatus["level"]>();
  for (let i = 0; i < HISTORY_DAYS; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - (HISTORY_DAYS - 1 - i));
    dayMap.set(d.toISOString().slice(0, 10), "operational");
  }

  for (const incident of incidents) {
    if (!productIds(incident).includes(productId)) {
      continue;
    }

    const level = severityToDayLevel(incident[2]);
    const { start, end } = incidentWindow(incident);

    const cursor = new Date(start);
    cursor.setHours(0, 0, 0, 0);
    const endDay = new Date(end);
    endDay.setHours(0, 0, 0, 0);

    while (cursor <= endDay) {
      const key = cursor.toISOString().slice(0, 10);
      const existing = dayMap.get(key);
      if (
        existing !== undefined &&
        DAY_LEVEL_SEVERITY[level] > DAY_LEVEL_SEVERITY[existing]
      ) {
        dayMap.set(key, level);
      }
      cursor.setDate(cursor.getDate() + 1);
    }
  }

  return Array.from(dayMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, level]) => ({ date, level }));
}

function mapActiveIncidents(
  incidents: AiStudioIncidentTuple[],
): StatusIncident[] {
  return incidents.map((incident) => {
    const last = updates(incident).at(-1);
    return {
      id: incident[0],
      name: incident[1],
      status: last
        ? (AI_STUDIO_STATE_NAMES[last[0]] ?? "investigating")
        : "investigating",
      impact: incident[2] === 2 ? "critical" : "minor",
      updatedAt: last
        ? new Date(updateEpochMs(last)).toISOString()
        : new Date().toISOString(),
      body: last?.[3],
      affectedComponentIds: productIds(incident).map(String),
    };
  });
}

export const aiStudioAdapter: StatusAdapter = {
  async detect(siteUrl: string): Promise<boolean> {
    try {
      return new URL(normalizeSiteUrl(siteUrl)).hostname === AI_STUDIO_HOST;
    } catch {
      return false;
    }
  },

  async fetchSnapshot(): Promise<StatusSnapshot> {
    const fetchedAt = new Date().toISOString();

    try {
      const incidents = await fetchIncidents();

      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - HISTORY_DAYS);
      const recentIncidents = incidents.filter((incident) => {
        const { end } = incidentWindow(incident);
        return !isResolved(incident) || end >= cutoff;
      });

      const activeIncidents = recentIncidents.filter(
        (incident) => !isResolved(incident),
      );

      const components: ComponentStatus[] = Object.entries(PRODUCT_NAMES).map(
        ([id, name]) => {
          const productId = Number(id);
          const affecting = activeIncidents.filter((incident) =>
            productIds(incident).includes(productId),
          );
          const worst = affecting.reduce(
            (max, incident) => Math.max(max, incident[2]),
            0,
          );

          return {
            id,
            name,
            status:
              affecting.length > 0
                ? severityToComponentStatus(worst)
                : "operational",
            historyDays: buildProductHistory(productId, recentIncidents),
          };
        },
      );

      const indicator = activeIncidents.reduce<StatusIndicator>(
        (worst, incident) => {
          const current = severityToIndicator(incident[2]);
          const rank = { none: 0, minor: 1, major: 2, critical: 3 };
          return rank[current] > rank[worst] ? current : worst;
        },
        "none",
      );

      const incidentsOut = mapActiveIncidents(activeIncidents);

      return {
        pageName: "Google AI Studio & Gemini API",
        pageUrl: STATUS_PAGE,
        overallDescription: overallDescription(indicator, incidentsOut.length),
        indicator,
        components,
        incidents: incidentsOut,
        historyDays: buildPageHistoryFromComponents(components),
        fetchedAt,
      };
    } catch (error) {
      return {
        pageName: "Google AI Studio & Gemini API",
        pageUrl: STATUS_PAGE,
        overallDescription: "Failed to fetch",
        indicator: "none",
        components: [],
        incidents: [],
        fetchedAt,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  },
};
