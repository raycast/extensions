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
  AwsCurrentEvent,
  AwsEventLogEntry,
  AwsHistoryEvent,
  AwsHistoryEvents,
} from "@/types/aws";

const AWS_HOSTS = new Set(["health.aws.amazon.com", "status.aws.amazon.com"]);
const AWS_PAGE = "https://health.aws.amazon.com/health/status";
const CURRENT_EVENTS_URL = "https://health.aws.amazon.com/public/currentevents";
const HISTORY_EVENTS_URL =
  "https://history-events-eu-west-1-prod.s3.amazonaws.com/historyevents.json";

/** The currentevents endpoint serves UTF-16 JSON (BOM decides endianness). */
async function fetchAwsJson<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  const bytes = new Uint8Array(await response.arrayBuffer());

  let text: string;
  if (bytes[0] === 0xfe && bytes[1] === 0xff) {
    const swapped = new Uint8Array(bytes.length - 2);
    for (let i = 2; i + 1 < bytes.length; i += 2) {
      swapped[i - 2] = bytes[i + 1];
      swapped[i - 1] = bytes[i];
    }
    text = new TextDecoder("utf-16le").decode(swapped);
  } else if (bytes[0] === 0xff && bytes[1] === 0xfe) {
    text = new TextDecoder("utf-16le").decode(bytes.subarray(2));
  } else {
    text = new TextDecoder("utf-8").decode(bytes);
  }

  return JSON.parse(text.replace(/^\uFEFF/, "")) as T;
}

function isAwsHost(siteUrl: string): boolean {
  try {
    return AWS_HOSTS.has(new URL(normalizeSiteUrl(siteUrl)).hostname);
  } catch {
    return false;
  }
}

function lastLog(
  event: AwsCurrentEvent | AwsHistoryEvent,
): AwsEventLogEntry | undefined {
  const log = event.event_log;
  return log && log.length > 0 ? log[log.length - 1] : undefined;
}

function isEventActive(event: AwsCurrentEvent | AwsHistoryEvent): boolean {
  const last = lastLog(event);
  if (last !== undefined) {
    return String(last.status) !== "0";
  }
  return String(event.status) !== "0";
}

/** arn:aws:health:us-east-1::event/EC2/... -> { service: "EC2", region: "us-east-1" } */
function parseArn(arn: string): { service?: string; region?: string } {
  const parts = arn.split(":");
  const region = parts[3] || undefined;
  const service = parts[5]?.split("/")[1];
  return { service, region };
}

function componentKey(event: AwsCurrentEvent | AwsHistoryEvent): string {
  if ("service" in event && event.service) {
    return event.service;
  }
  const { service, region } = parseArn(event.arn);
  const name = (service ?? "unknown").toLowerCase().replace(/_/g, "");
  return region ? `${name}-${region}` : name;
}

function componentName(
  key: string,
  events: Array<AwsCurrentEvent | AwsHistoryEvent>,
): string {
  const current = events.find(
    (event): event is AwsCurrentEvent =>
      "service_name" in event && Boolean(event.service_name),
  );
  const { service, region } = parseArn(events[0].arn);

  const base =
    current?.service_name ??
    (service ? service.replace(/_/g, " ") : key.toUpperCase());
  const regionLabel =
    (current && "region_name" in current && current.region_name) || region;

  return regionLabel ? `${base} (${regionLabel})` : base;
}

function severityToComponentStatus(status: string): ComponentStatusValue {
  switch (status) {
    case "2":
      return "partial_outage";
    case "3":
      return "major_outage";
    default:
      return "degraded_performance";
  }
}

function severityToDayLevel(status: string): DayStatus["level"] {
  switch (status) {
    case "2":
      return "partial";
    case "3":
      return "major";
    default:
      return "degraded";
  }
}

function severityToIndicator(status: string): StatusIndicator {
  switch (status) {
    case "2":
      return "major";
    case "3":
      return "critical";
    default:
      return "minor";
  }
}

function severityToImpact(status: string): string {
  switch (status) {
    case "2":
      return "major";
    case "3":
      return "critical";
    default:
      return "minor";
  }
}

function severityLabel(status: string): string {
  switch (status) {
    case "2":
      return "degraded";
    case "3":
      return "disrupted";
    default:
      return "impacted";
  }
}

const DAY_LEVEL_SEVERITY: Record<DayStatus["level"], number> = {
  operational: 0,
  degraded: 1,
  partial: 2,
  major: 3,
  unknown: 0,
};

interface TrackedEvent {
  event: AwsCurrentEvent | AwsHistoryEvent;
  /** Only events from the currentevents endpoint may be ongoing; history
   * events sometimes lack a final "resolved" log entry. */
  canBeActive: boolean;
}

function isActive(tracked: TrackedEvent): boolean {
  return tracked.canBeActive && isEventActive(tracked.event);
}

function buildHistory(events: TrackedEvent[], days = 90): DayStatus[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const dayMap = new Map<string, DayStatus["level"]>();
  for (let i = 0; i < days; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - (days - 1 - i));
    dayMap.set(d.toISOString().slice(0, 10), "operational");
  }

  for (const tracked of events) {
    const { event } = tracked;
    const start = new Date(parseInt(event.date, 10) * 1000);
    const last = lastLog(event);
    const end = isActive(tracked)
      ? today
      : new Date((last?.timestamp ?? parseInt(event.date, 10)) * 1000);
    const level = severityToDayLevel(String(event.status));

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

function buildComponents(
  currentEvents: AwsCurrentEvent[],
  history: AwsHistoryEvents,
): ComponentStatus[] {
  const byKey = new Map<string, TrackedEvent[]>();

  for (const [key, events] of Object.entries(history)) {
    byKey.set(
      key,
      events.map((event) => ({ event, canBeActive: false })),
    );
  }
  for (const event of currentEvents) {
    const key = componentKey(event);
    byKey.set(key, [...(byKey.get(key) ?? []), { event, canBeActive: true }]);
  }

  return Array.from(byKey.entries())
    .filter(([, events]) => events.length > 0)
    .map(([key, events]) => {
      const worst = events
        .filter(isActive)
        .map((tracked) => String(tracked.event.status))
        .sort()
        .pop();

      return {
        id: key,
        name: componentName(
          key,
          events.map((tracked) => tracked.event),
        ),
        status: worst
          ? severityToComponentStatus(worst)
          : ("operational" as const),
        historyDays: buildHistory(events),
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

function mapIncidents(currentEvents: AwsCurrentEvent[]): StatusIncident[] {
  return currentEvents.filter(isEventActive).map((event) => {
    const last = lastLog(event);
    const scope = [event.service_name, event.region_name]
      .filter(Boolean)
      .join(" — ");

    return {
      id: event.arn,
      name: scope ? `${scope}: ${event.summary}` : event.summary,
      status: severityLabel(String(event.status)),
      impact: severityToImpact(String(event.status)),
      updatedAt: new Date(
        (last?.timestamp ?? parseInt(event.date, 10)) * 1000,
      ).toISOString(),
      body: last?.message,
      affectedComponentIds: [componentKey(event)],
    };
  });
}

export const awsAdapter: StatusAdapter = {
  async detect(siteUrl: string): Promise<boolean> {
    return isAwsHost(siteUrl);
  },

  async fetchSnapshot(): Promise<StatusSnapshot> {
    const fetchedAt = new Date().toISOString();

    try {
      const [currentEvents, history] = await Promise.all([
        fetchAwsJson<AwsCurrentEvent[]>(CURRENT_EVENTS_URL),
        fetchAwsJson<AwsHistoryEvents>(HISTORY_EVENTS_URL).catch(
          () => ({}) as AwsHistoryEvents,
        ),
      ]);

      const components = buildComponents(currentEvents ?? [], history);
      const incidents = mapIncidents(currentEvents ?? []);

      const indicator: StatusIndicator =
        incidents.length > 0
          ? severityToIndicator(
              incidents.some((incident) => incident.impact === "critical")
                ? "3"
                : incidents.some((incident) => incident.impact === "major")
                  ? "2"
                  : "1",
            )
          : "none";

      return {
        pageName: "AWS",
        pageUrl: AWS_PAGE,
        overallDescription: overallDescription(indicator, incidents.length),
        indicator,
        components,
        incidents,
        historyDays: buildPageHistoryFromComponents(components),
        fetchedAt,
      };
    } catch (error) {
      return {
        pageName: "AWS",
        pageUrl: AWS_PAGE,
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
