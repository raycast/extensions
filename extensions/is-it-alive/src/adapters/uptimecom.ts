import type {
  ComponentStatus,
  ComponentStatusValue,
  DayStatus,
  FetchSnapshotInput,
  StatusAdapter,
  StatusIncident,
  StatusIndicator,
  StatusSnapshot,
} from "@/types";
import { normalizeSiteUrl } from "@/lib/url";
import { overallDescription } from "@/lib/snapshot-text";
import { buildPageHistoryFromComponents } from "@/lib/uptime-chart";
import type {
  UptimeComComponent,
  UptimeComHistoryResponse,
  UptimeComIncident,
  UptimeComPageProps,
} from "@/types/uptimecom";

const PROPS_MARKER = "createElement(StatusPageDisplayController,";
const HISTORY_DAYS = 90;

/**
 * Uptime.com status pages render server-side and embed the full page state as
 * React props in an inline script: createElement(StatusPageDisplayController,
 * {...}). The props JSON also carries per-page AJAX URLs (e.g. the history
 * endpoint used for the 90-day view).
 */
function extractPageProps(html: string): UptimeComPageProps | null {
  const marker = html.indexOf(PROPS_MARKER);
  if (marker === -1) {
    return null;
  }

  const start = html.indexOf("{", marker);
  if (start === -1) {
    return null;
  }

  let depth = 0;
  let inString = false;
  let escaped = false;
  let end = -1;

  for (let i = start; i < html.length; i++) {
    const char = html[i];
    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === '"') {
        inString = false;
      }
      continue;
    }

    if (char === '"') {
      inString = true;
    } else if (char === "{") {
      depth++;
    } else if (char === "}") {
      depth--;
      if (depth === 0) {
        end = i;
        break;
      }
    }
  }

  if (end === -1) {
    return null;
  }

  try {
    return JSON.parse(html.slice(start, end + 1)) as UptimeComPageProps;
  } catch {
    return null;
  }
}

async function fetchPageProps(
  siteUrl: string,
): Promise<UptimeComPageProps | null> {
  const response = await fetch(siteUrl, {
    headers: { Accept: "text/html" },
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  return extractPageProps(await response.text());
}

function componentStatusValue(status: string): ComponentStatusValue | string {
  switch (status) {
    case "operational":
      return "operational";
    case "degraded-performance":
      return "degraded_performance";
    case "partial-outage":
      return "partial_outage";
    case "major-outage":
      return "major_outage";
    case "under-maintenance":
      return "under_maintenance";
    default:
      return status;
  }
}

function statusToDayLevel(status: string): DayStatus["level"] {
  switch (status) {
    case "major-outage":
      return "major";
    case "partial-outage":
      return "partial";
    case "degraded-performance":
    case "under-maintenance":
      return "degraded";
    default:
      return "operational";
  }
}

function statusToIndicator(status: string): StatusIndicator {
  switch (status) {
    case "major-outage":
      return "critical";
    case "partial-outage":
      return "major";
    case "degraded-performance":
    case "under-maintenance":
      return "minor";
    default:
      return "none";
  }
}

const INDICATOR_SEVERITY: Record<StatusIndicator, number> = {
  none: 0,
  minor: 1,
  major: 2,
  critical: 3,
};

const DAY_LEVEL_SEVERITY: Record<DayStatus["level"], number> = {
  operational: 0,
  unknown: 0,
  degraded: 1,
  partial: 2,
  major: 3,
};

function worstIndicator(indicators: StatusIndicator[]): StatusIndicator {
  return indicators.reduce<StatusIndicator>(
    (worst, indicator) =>
      INDICATOR_SEVERITY[indicator] > INDICATOR_SEVERITY[worst]
        ? indicator
        : worst,
    "none",
  );
}

/** Flatten component groups into "Group / Component" leaf entries. */
function flattenComponents(
  components: UptimeComComponent[],
  prefix = "",
): Array<{ id: number; name: string; status: string }> {
  const result: Array<{ id: number; name: string; status: string }> = [];

  for (const component of components) {
    const name = prefix ? `${prefix} / ${component.name}` : component.name;
    if (component.is_group && component.subcomponents?.length) {
      result.push(...flattenComponents(component.subcomponents, name));
    } else {
      result.push({ id: component.id, name, status: component.status });
    }
  }

  return result;
}

function isMaintenance(incident: UptimeComIncident): boolean {
  return incident.incident_type === "SCHEDULED_MAINTENANCE";
}

function incidentWindow(incident: UptimeComIncident): {
  start: Date;
  end: Date;
} {
  const start = incident.starts_at ? new Date(incident.starts_at) : new Date();
  const end = incident.ends_at ? new Date(incident.ends_at) : new Date();
  return { start, end };
}

function incidentDayLevel(
  incident: UptimeComIncident,
  componentId?: number,
): DayStatus["level"] {
  const affected = (incident.affected_components ?? []).filter(
    (component) => componentId === undefined || component.id === componentId,
  );

  let worst: DayStatus["level"] = "degraded";
  for (const component of affected) {
    const level = statusToDayLevel(component.status);
    if (DAY_LEVEL_SEVERITY[level] > DAY_LEVEL_SEVERITY[worst]) {
      worst = level;
    }
  }
  return worst;
}

function emptyHistory(): Map<string, DayStatus["level"]> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const dayMap = new Map<string, DayStatus["level"]>();
  for (let i = 0; i < HISTORY_DAYS; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - (HISTORY_DAYS - 1 - i));
    dayMap.set(d.toISOString().slice(0, 10), "operational");
  }
  return dayMap;
}

function toDayStatuses(dayMap: Map<string, DayStatus["level"]>): DayStatus[] {
  return Array.from(dayMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, level]) => ({ date, level }));
}

function buildComponentHistory(
  componentId: number,
  incidents: UptimeComIncident[],
): DayStatus[] {
  const dayMap = emptyHistory();

  for (const incident of incidents) {
    if (isMaintenance(incident)) {
      continue;
    }
    const affectsComponent = (incident.affected_components ?? []).some(
      (component) => component.id === componentId,
    );
    if (!affectsComponent) {
      continue;
    }

    const level = incidentDayLevel(incident, componentId);
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

  return toDayStatuses(dayMap);
}

function isIncidentActive(incident: UptimeComIncident): boolean {
  const state =
    incident.latest_update_incident_state ??
    incident.updates?.[0]?.incident_state;
  if (state === "resolved") {
    return false;
  }
  return !incident.ends_at || new Date(incident.ends_at) > new Date();
}

function mapIncidents(incidents: UptimeComIncident[]): StatusIncident[] {
  return incidents.map((incident) => {
    const update = incident.updates?.[0];
    return {
      id: String(incident.id),
      name: incident.name,
      status:
        incident.latest_update_incident_state ??
        update?.incident_state ??
        (isMaintenance(incident) ? "maintenance" : "investigating"),
      impact: worstIndicator(
        (incident.affected_components ?? []).map((component) =>
          statusToIndicator(component.status),
        ),
      ),
      updatedAt: update?.updated_at ?? incident.starts_at ?? "",
      body: incident.latest_update_description ?? update?.description,
      affectedComponentIds: (incident.affected_components ?? []).map(
        (component) => String(component.id),
      ),
    };
  });
}

function historyRangeQuery(): string {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - (HISTORY_DAYS - 1));

  const format = (d: Date) => d.toISOString().slice(0, 10).replace(/-/g, "");
  return `?start=${format(start)}&end=${format(end)}`;
}

export const uptimecomAdapter: StatusAdapter = {
  async detect(siteUrl: string): Promise<boolean> {
    try {
      const normalized = normalizeSiteUrl(siteUrl);
      const props = await fetchPageProps(normalized);
      return props?.statuspage !== undefined;
    } catch {
      return false;
    }
  },

  async fetchSnapshot(input: FetchSnapshotInput): Promise<StatusSnapshot> {
    const normalized = normalizeSiteUrl(input.url);
    const fetchedAt = new Date().toISOString();

    try {
      const props = await fetchPageProps(normalized);
      const statuspage = props?.statuspage;
      if (!statuspage) {
        throw new Error("Not an Uptime.com status page");
      }

      let history: UptimeComHistoryResponse["data"];
      if (props.updateHistoryURL) {
        const historyUrl = new URL(props.updateHistoryURL, normalized);
        history = await fetch(`${historyUrl.href}${historyRangeQuery()}`, {
          headers: { Accept: "application/json" },
        })
          .then((response) =>
            response.ok
              ? (response.json() as Promise<UptimeComHistoryResponse>)
              : Promise.resolve({} as UptimeComHistoryResponse),
          )
          .then((body) => body.data)
          .catch(() => undefined);
      }

      const pastIncidents = history?.past_incidents ?? [];
      const componentUptime = history?.component_history ?? {};

      const components: ComponentStatus[] = flattenComponents(
        statuspage.components ?? [],
      ).map((component) => {
        const uptimePct = componentUptime[String(component.id)]?.uptime_pct;
        return {
          id: String(component.id),
          name: component.name,
          status: componentStatusValue(component.status),
          uptimePercent:
            typeof uptimePct === "number" ? uptimePct * 100 : undefined,
          historyDays: buildComponentHistory(component.id, pastIncidents),
        };
      });

      const activeIncidents = (statuspage.active_incidents ?? []).filter(
        isIncidentActive,
      );
      const incidents = mapIncidents(activeIncidents);

      const indicator = worstIndicator(
        flattenComponents(statuspage.components ?? []).map((component) =>
          statusToIndicator(component.status),
        ),
      );

      const globalUptime = history?.global_metrics?.uptime_pct;

      return {
        pageName: statuspage.name,
        pageUrl: normalized,
        overallDescription: overallDescription(indicator, incidents.length),
        indicator,
        components,
        incidents,
        historyDays: buildPageHistoryFromComponents(components),
        uptimePercent:
          typeof globalUptime === "number" ? globalUptime * 100 : undefined,
        fetchedAt,
      };
    } catch (error) {
      return {
        pageName: new URL(normalized).hostname,
        pageUrl: normalized,
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
