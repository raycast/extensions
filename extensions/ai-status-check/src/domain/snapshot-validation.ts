import { parseDateKey } from "../utils/dates";
import type { ComponentHistory, Incident, ProviderSnapshot } from "./types";

const HEALTH = ["operational", "degraded", "partial_outage", "major_outage", "maintenance", "unknown"];
const STATES = ["investigating", "identified", "monitoring", "resolved", "scheduled", "unknown"];
const LEVELS = [...HEALTH, "affected", "informational", "not_monitored"];
const AVAILABILITY = ["available", "unavailable", "unsupported"];

/** Validate persisted or newly fetched data before consumers trust its TypeScript shape. */
export function assertProviderSnapshot(value: unknown, providerId: string): asserts value is ProviderSnapshot {
  const snapshot = record(value, "snapshot");
  check(snapshot.providerId === providerId, "Snapshot identified a different provider");
  check(HEALTH.includes(string(snapshot.health, "provider health")), "Unknown provider health");
  timestamp(snapshot.fetchedAt, "fetchedAt");
  optionalText(snapshot.statusText, "provider status text");
  availability(snapshot.incidentHistoryAvailability);
  const components = records(snapshot.components, "components");
  uniqueIds(components, "component");
  for (const component of components) {
    string(component.name, "component name");
    check(HEALTH.includes(string(component.health, "component health")), "Unknown component health");
    for (const field of ["group", "statusText", "url"]) optionalText(component[field], `component ${field}`);
    availability(component.historyAvailability);
    if (component.history !== undefined) {
      assertComponentHistory(component.history);
      check(
        component.historyAvailability === undefined || component.historyAvailability === "available",
        "History availability contradicted its data",
      );
    } else {
      check(component.historyAvailability !== "available", "Available history was missing its data");
    }
  }
  assertIncidents(snapshot.incidents);
}

export function assertIncidents(value: unknown): asserts value is Incident[] {
  const incidents = records(value, "incidents");
  uniqueIds(incidents, "incident");
  for (const incident of incidents) {
    string(incident.title, "incident title");
    check(HEALTH.includes(string(incident.health, "incident health")), "Unknown incident health");
    check(STATES.includes(string(incident.state, "incident state")), "Unknown incident state");
    for (const field of ["stateText", "impactText", "url"]) optionalText(incident[field], `incident ${field}`);
    for (const field of ["startedAt", "updatedAt", "resolvedAt"]) {
      if (incident[field] !== undefined) timestamp(incident[field], field);
    }
    check(Array.isArray(incident.affectedComponentIds), "Missing affected component IDs");
    for (const id of incident.affectedComponentIds) string(id, "affected component ID");
    const updates = records(incident.updates, "incident updates");
    uniqueIds(updates, "update");
    for (const update of updates) {
      string(update.body, "update body");
      check(STATES.includes(string(update.state, "update state")), "Unknown update state");
      optionalText(update.stateText, "update state text");
      timestamp(update.createdAt, "update createdAt");
    }
  }
}

export function assertComponentHistory(value: unknown): asserts value is ComponentHistory {
  const history = record(value, "component history");
  check(history.basis === "availability" || history.basis === "incidents", "Unknown history basis");
  const days = records(history.days, "history days");
  check(days.length > 0 && history.windowDays === days.length, "History window did not match its days");
  if (history.periodDays !== undefined) {
    check(
      typeof history.periodDays === "number" &&
        Number.isInteger(history.periodDays) &&
        history.periodDays > 0 &&
        history.periodDays + 1 === days.length,
      "Invalid elapsed history period",
    );
  }
  let previous: string | undefined;
  for (const day of days) {
    const date = parseDateKey(day.date);
    check(date !== undefined, "Invalid history date");
    check(!previous || Date.parse(date) - Date.parse(previous) === 86_400_000, "History dates were not contiguous");
    check(LEVELS.includes(string(day.level, "history level")), "Unknown history level");
    previous = date;
  }
  if (history.uptimePercent !== undefined) {
    check(
      typeof history.uptimePercent === "number" &&
        Number.isFinite(history.uptimePercent) &&
        history.uptimePercent >= 0 &&
        history.uptimePercent <= 100,
      "Invalid uptime percentage",
    );
  }
  if (history.uptimeText !== undefined) {
    const match = /^(\d+(?:\.\d+)?)%$/.exec(string(history.uptimeText, "uptime text"));
    const precision = match?.[1]?.split(".")[1]?.length ?? 0;
    // Public pages may round the display while retaining a more precise API value.
    check(
      match !== null &&
        typeof history.uptimePercent === "number" &&
        Math.abs(Number(match[1]) - history.uptimePercent) <= 0.5 * 10 ** -precision + Number.EPSILON * 100,
      "Published uptime text did not match its value",
    );
  }
  if (history.monitoredSince !== undefined) {
    const since = parseDateKey(history.monitoredSince);
    check(since !== undefined, "Invalid monitoring date");
    check(
      days.every((day) => String(day.date) >= since || day.level === "not_monitored"),
      "History treated pre-monitoring dates as monitored",
    );
  }
}

function availability(value: unknown): void {
  if (value !== undefined) check(AVAILABILITY.includes(string(value, "availability")), "Unknown availability");
}

function uniqueIds(items: Record<string, unknown>[], label: string): void {
  const ids = items.map((item) => string(item.id, `${label} ID`));
  check(new Set(ids).size === ids.length, `Duplicate ${label} IDs`);
}

function timestamp(value: unknown, label: string): void {
  check(Number.isFinite(Date.parse(string(value, label))), `Invalid ${label}`);
}

function optionalText(value: unknown, label: string): void {
  if (value !== undefined) string(value, label);
}

function string(value: unknown, label: string): string {
  check(typeof value === "string" && value.trim().length > 0, `Missing or invalid ${label}`);
  return value;
}

function records(value: unknown, label: string): Record<string, unknown>[] {
  check(Array.isArray(value), `Missing ${label}`);
  return value.map((item) => record(item, label));
}

function record(value: unknown, label: string): Record<string, unknown> {
  check(typeof value === "object" && value !== null && !Array.isArray(value), `Invalid ${label}`);
  return value as Record<string, unknown>;
}

function check(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}
