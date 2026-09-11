import type {
  SiteProvider,
  StatusIncident,
  StatusIndicator,
  StatusSnapshot,
} from "@/types";
import {
  cloudProviderFromSiteProvider,
  normalizeRegionLookupKey,
  resolveCatalogRegions,
} from "@/lib/region-catalog";
import { overallDescription } from "@/lib/snapshot-text";
import { buildPageHistoryFromComponents } from "@/lib/uptime-chart";

export function isCloudProvider(provider: SiteProvider): boolean {
  return provider === "aws";
}

export function regionKeysMatch(a: string, b: string): boolean {
  return normalizeRegionLookupKey(a) === normalizeRegionLookupKey(b);
}

export function matchesMonitoredRegions(
  regions: string[] | undefined,
  monitoredRegions: string[],
): boolean {
  if (monitoredRegions.length === 0) {
    return true;
  }
  if (!regions?.length) {
    return true;
  }

  return regions.some((region) =>
    monitoredRegions.some((monitored) => regionKeysMatch(monitored, region)),
  );
}

const AWS_REGION_PATTERN =
  /\b([a-z]{2}-(?:central|north|south|east|west|northeast|southeast|northwest|southwest)-\d+)\b/gi;

export function extractAwsRegions(event: {
  arn?: string;
  service?: string;
  event_log?: Array<{ message?: string }>;
}): string[] {
  const raw = new Set<string>();

  const arnMatch = event.arn?.match(/arn:aws:health:([^:]+)::/i);
  if (arnMatch) {
    raw.add(arnMatch[1].toLowerCase());
  }

  const serviceMatch = event.service?.match(
    /-([a-z]{2}-(?:central|north|south|east|west|northeast|southeast|northwest|southwest)-\d+)$/i,
  );
  if (serviceMatch) {
    raw.add(serviceMatch[1].toLowerCase());
  }

  const message =
    event.event_log?.map((entry) => entry.message).join(" ") ?? "";
  for (const match of message.matchAll(AWS_REGION_PATTERN)) {
    raw.add(match[1].toLowerCase());
  }

  return resolveCatalogRegions("aws", raw);
}

function impactToIndicator(impact: string): StatusIndicator {
  switch (impact) {
    case "critical":
      return "critical";
    case "major":
      return "major";
    case "minor":
      return "minor";
    default:
      return "minor";
  }
}

function worstIndicatorFromIncidents(
  incidents: StatusIncident[],
): StatusIndicator {
  const order: StatusIndicator[] = ["none", "minor", "major", "critical"];
  let worst: StatusIndicator = "none";

  for (const incident of incidents) {
    const indicator = impactToIndicator(incident.impact);
    if (order.indexOf(indicator) > order.indexOf(worst)) {
      worst = indicator;
    }
  }

  return worst;
}

export function applyRegionFilter(
  snapshot: StatusSnapshot,
  monitoredRegions: string[] | undefined,
  provider: SiteProvider,
): StatusSnapshot {
  const cloudProvider = cloudProviderFromSiteProvider(provider);
  if (!cloudProvider || !monitoredRegions?.length) {
    return snapshot;
  }

  const monitored = resolveCatalogRegions(cloudProvider, monitoredRegions);
  if (monitored.length === 0) {
    return snapshot;
  }

  const components = snapshot.components.filter((component) =>
    matchesMonitoredRegions(component.regions, monitored),
  );
  const incidents = snapshot.incidents.filter((incident) =>
    matchesMonitoredRegions(incident.regions, monitored),
  );
  const indicator = worstIndicatorFromIncidents(incidents);

  return {
    ...snapshot,
    components,
    incidents,
    indicator,
    overallDescription: overallDescription(indicator, incidents.length),
    historyDays: buildPageHistoryFromComponents(components),
    regionFilter: {
      monitored,
      hiddenIncidents: snapshot.incidents.length - incidents.length,
      hiddenComponents: snapshot.components.length - components.length,
    },
  };
}
