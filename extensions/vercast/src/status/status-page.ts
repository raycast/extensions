import { Color, Icon, Image } from "@raycast/api";
import type {
  ComponentStatus,
  Incident,
  IncidentHistory,
  IncidentImpact,
  IncidentStatus,
  IncidentUpdate,
  ScheduledMaintenance,
  StatusComponent,
  StatusSummary,
} from "./types";
import fromNow from "../utils/time";

export const STATUS_PAGE_URL = "https://www.vercel-status.com";
export const STATUS_SUMMARY_URL = `${STATUS_PAGE_URL}/api/v2/summary.json`;
export const INCIDENT_HISTORY_URL = `${STATUS_PAGE_URL}/api/v2/incidents.json`;

async function readStatusJson(response: Response): Promise<Record<string, unknown>> {
  if (!response.ok) {
    throw new Error(`Vercel status page returned ${response.status} ${response.statusText}`.trim());
  }
  const body: unknown = await response.json().catch(() => undefined);
  if (!body || typeof body !== "object") {
    throw new Error("Vercel status page returned an unexpected response");
  }
  return body as Record<string, unknown>;
}

type Raw = Record<string, unknown>;
const isRecord = (value: unknown): value is Raw => typeof value === "object" && value !== null;
const isString = (value: unknown): value is string => typeof value === "string";
const stringOr = <T>(value: unknown, fallback: T): string | T => (isString(value) ? value : fallback);

/** The entries `toEntry` accepts: a malformed entry in the feed is dropped instead of crashing a render. */
function entries<T>(value: unknown, toEntry: (raw: Raw) => T | undefined): T[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((raw) => {
    const entry = isRecord(raw) ? toEntry(raw) : undefined;
    return entry ? [entry] : [];
  });
}

function toComponent(raw: Raw): StatusComponent | undefined {
  if (!isString(raw.id) || !isString(raw.name) || !isString(raw.status)) return undefined;
  return {
    id: raw.id,
    name: raw.name,
    status: raw.status as ComponentStatus,
    description: stringOr(raw.description, null),
    position: typeof raw.position === "number" ? raw.position : 0,
    group: raw.group === true,
    group_id: stringOr(raw.group_id, null),
    only_show_if_degraded: raw.only_show_if_degraded === true,
    components: Array.isArray(raw.components) ? raw.components.filter(isString) : undefined,
  };
}

function toUpdate(raw: Raw): IncidentUpdate | undefined {
  if (!isString(raw.status)) return undefined;
  return {
    status: raw.status as IncidentStatus,
    body: stringOr(raw.body, ""),
    display_at: stringOr(raw.display_at, ""),
  };
}

function toIncident(raw: Raw): Incident | undefined {
  if (!isString(raw.id) || !isString(raw.name) || !isString(raw.status)) return undefined;
  const createdAt = stringOr(raw.created_at, "");
  const incident: Incident = {
    id: raw.id,
    name: raw.name,
    status: raw.status as IncidentStatus,
    impact: stringOr(raw.impact, "none") as IncidentImpact,
    shortlink: stringOr(raw.shortlink, ""),
    created_at: createdAt,
    started_at: stringOr(raw.started_at, undefined),
    updated_at: stringOr(raw.updated_at, createdAt),
    resolved_at: stringOr(raw.resolved_at, null),
    incident_updates: entries(raw.incident_updates, toUpdate),
    components: entries(raw.components, toComponent),
  };
  // The history mixes maintenance windows in with incidents; keep their window so isMaintenance sees them.
  return isString(raw.scheduled_for)
    ? ({
        ...incident,
        scheduled_for: raw.scheduled_for,
        scheduled_until: stringOr(raw.scheduled_until, ""),
      } as Incident)
    : incident;
}

function toMaintenance(raw: Raw): ScheduledMaintenance | undefined {
  const incident = toIncident(raw);
  return incident && isMaintenance(incident) ? incident : undefined;
}

/**
 * Checks every field the views read, so a captive portal, an API change or one malformed entry fails as an
 * error row (or drops that entry), never as a crash that takes the deployments menu down with it.
 */
export async function parseStatusSummary(response: Response): Promise<StatusSummary> {
  const body = await readStatusJson(response);
  const status = isRecord(body.status) ? body.status : undefined;
  if (!status || !isString(status.description)) {
    throw new Error("Vercel status page returned an unexpected response");
  }
  return {
    page: { updated_at: stringOr(isRecord(body.page) ? body.page.updated_at : undefined, "") },
    status: { indicator: stringOr(status.indicator, "none") as IncidentImpact, description: status.description },
    components: entries(body.components, toComponent),
    incidents: entries(body.incidents, toIncident),
    scheduled_maintenances: entries(body.scheduled_maintenances, toMaintenance),
  };
}

export async function parseIncidentHistory(response: Response): Promise<IncidentHistory> {
  return { incidents: entries((await readStatusJson(response)).incidents, toIncident) };
}

export async function fetchStatusSummary(): Promise<StatusSummary> {
  return parseStatusSummary(await fetch(STATUS_SUMMARY_URL, { signal: AbortSignal.timeout(10_000) }));
}

const COMPONENT_STATUS: Record<ComponentStatus, { label: string; color: Color; icon: Icon }> = {
  operational: { label: "Operational", color: Color.Green, icon: Icon.CheckCircle },
  degraded_performance: { label: "Degraded Performance", color: Color.Yellow, icon: Icon.Warning },
  partial_outage: { label: "Partial Outage", color: Color.Orange, icon: Icon.Warning },
  major_outage: { label: "Major Outage", color: Color.Red, icon: Icon.XMarkCircle },
  under_maintenance: { label: "Under Maintenance", color: Color.Blue, icon: Icon.WrenchScrewdriver },
};

const IMPACT_COLOR: Record<IncidentImpact, Color> = {
  none: Color.SecondaryText,
  minor: Color.Yellow,
  major: Color.Orange,
  critical: Color.Red,
  maintenance: Color.Blue,
};

export function componentStatusLabel(status: ComponentStatus): string {
  return COMPONENT_STATUS[status]?.label ?? humanize(status);
}

export function componentStatusColor(status: ComponentStatus): Color {
  return COMPONENT_STATUS[status]?.color ?? Color.SecondaryText;
}

export function componentStatusIcon(status: ComponentStatus): Image.ImageLike {
  const entry = COMPONENT_STATUS[status];
  return entry ? { source: entry.icon, tintColor: entry.color } : Icon.QuestionMarkCircle;
}

export function impactColor(impact: IncidentImpact): Color {
  return IMPACT_COLOR[impact] ?? Color.SecondaryText;
}

export function incidentIcon(incident: Incident): Image.ImageLike {
  if (isMaintenance(incident)) return indicatorIcon("maintenance");
  if (incident.resolved_at) return indicatorIcon("none");
  // An unresolved incident with no impact is still an incident, not a green check.
  if (incident.impact === "none") return { source: Icon.Warning, tintColor: Color.SecondaryText };
  return indicatorIcon(incident.impact);
}

/** Icon for the page as a whole: a shape per severity, so it still reads if the menu bar drops the tint. */
export function indicatorIcon(indicator: IncidentImpact): Image.ImageLike {
  switch (indicator) {
    case "none":
      return { source: Icon.CheckCircle, tintColor: Color.Green };
    case "maintenance":
      return { source: Icon.WrenchScrewdriver, tintColor: Color.Blue };
    case "critical":
      return { source: Icon.XMarkCircle, tintColor: Color.Red };
    default:
      return { source: Icon.Warning, tintColor: impactColor(indicator) };
  }
}

export function incidentStatusLabel(status: IncidentStatus): string {
  return humanize(status);
}

export function impactLabel(impact: IncidentImpact): string {
  return impact === "none" ? "No Impact" : humanize(impact);
}

function humanize(value: string): string {
  return value
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export function isMaintenance(incident: Incident): incident is ScheduledMaintenance {
  return "scheduled_for" in incident && Boolean(incident.scheduled_for);
}

// fromNow only phrases "in 3 days" / "2 hours ago" when its second argument is within 50 ms of the
// real now, so it gets a fresh Date on every call instead of one shared per render.
export function relativeTime(iso: string): string {
  const date = new Date(iso);
  // fromNow throws on an invalid date, which would take the whole menu bar down with it.
  return Number.isNaN(date.getTime()) ? "—" : fromNow(date, new Date());
}

export function formatStatusDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

export function incidentStartedAt(incident: Incident): string {
  return incident.started_at ?? incident.created_at;
}

export function latestUpdate(incident: Incident) {
  return incident.incident_updates[0];
}

export function incidentURL(incident: Incident): string {
  return incident.shortlink?.startsWith("https://")
    ? incident.shortlink
    : `${STATUS_PAGE_URL}/incidents/${incident.id}`;
}

function inProgressMaintenances(summary: StatusSummary): ScheduledMaintenance[] {
  return summary.scheduled_maintenances.filter((m) => m.status === "in_progress" || m.status === "verifying");
}

/** Maintenance windows in progress first, then the upcoming ones. */
export function maintenanceWindows(summary: StatusSummary): ScheduledMaintenance[] {
  return [
    ...inProgressMaintenances(summary),
    ...summary.scheduled_maintenances.filter((m) => m.status === "scheduled"),
  ];
}

export function maintenanceSubtitle(maintenance: ScheduledMaintenance): string {
  return maintenance.status === "scheduled"
    ? `Starts ${relativeTime(maintenance.scheduled_for)}`
    : incidentStatusLabel(maintenance.status);
}

/** Incidents from the history that were resolved within the last `days` days. */
export function recentlyResolved(
  incidents: Incident[],
  days: number,
  now: Date,
): (Incident & { resolved_at: string })[] {
  const since = now.getTime() - days * 24 * 60 * 60 * 1000;
  return incidents.filter(
    (incident): incident is Incident & { resolved_at: string } =>
      Boolean(incident.resolved_at) && new Date(incident.resolved_at as string).getTime() >= since,
  );
}

interface AffectedComponent {
  component: StatusComponent;
  /** "Group › Component", or the bare name when the component has no group or shares its group's name. */
  displayName: string;
}

/** Leaf components that are not operational, in status page order. */
export function affectedComponents(summary: StatusSummary): AffectedComponent[] {
  const groups = new Map(summary.components.filter((c) => c.group).map((c) => [c.id, c]));
  return summary.components
    .filter((c) => !c.group && c.status !== "operational")
    .map((component) => {
      const group = component.group_id ? groups.get(component.group_id) : undefined;
      const displayName = group && group.name !== component.name ? `${group.name} › ${component.name}` : component.name;
      return { component, displayName };
    });
}

/** True during an incident or an outage. Planned maintenance alone does not count: it is listed, not flagged. */
export function hasOngoingIncident(summary: StatusSummary): boolean {
  return (
    ["minor", "major", "critical"].includes(summary.status.indicator) ||
    summary.incidents.length > 0 ||
    affectedComponents(summary).some(({ component }) => component.status !== "under_maintenance")
  );
}

interface ComponentSection {
  id: string;
  title: string;
  components: StatusComponent[];
}

/**
 * Components as the status page lists them: one section per group, plus one for the ungrouped services.
 * Components flagged "only show if degraded" are left out while they are operational, as the page does.
 */
export function componentSections(summary: StatusSummary): ComponentSection[] {
  const byId = new Map(summary.components.map((c) => [c.id, c]));
  const visible = (c: StatusComponent) => !c.only_show_if_degraded || c.status !== "operational";
  const topLevel = summary.components.filter((c) => !c.group_id).sort((a, b) => a.position - b.position);

  const services: ComponentSection = { id: "ungrouped", title: "Services", components: [] };
  const groups: ComponentSection[] = [];
  for (const component of topLevel) {
    if (component.group) {
      const children = (component.components ?? [])
        .map((id) => byId.get(id))
        .filter((c): c is StatusComponent => Boolean(c && visible(c)));
      if (children.length > 0) {
        groups.push({ id: component.id, title: component.name, components: children });
      }
    } else if (visible(component)) {
      services.components.push(component);
    }
  }
  return services.components.length > 0 ? [services, ...groups] : groups;
}
