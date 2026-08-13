import { providerStatusPresentation } from "../../src/domain/status-presentation";
import type {
  ComponentHistory,
  ComponentHistoryLevel,
  Health,
  Incident,
  IncidentState,
  ProviderSnapshot,
} from "../../src/domain/types";
import { PROVIDERS } from "../../src/providers/registry";

const HEALTH_VALUES = new Set<Health>([
  "operational",
  "degraded",
  "partial_outage",
  "major_outage",
  "maintenance",
  "unknown",
]);
const INCIDENT_STATE_VALUES = new Set<IncidentState>([
  "investigating",
  "identified",
  "monitoring",
  "resolved",
  "scheduled",
  "unknown",
]);
const HISTORY_LEVEL_VALUES = new Set<ComponentHistoryLevel>([
  "operational",
  "degraded",
  "partial_outage",
  "major_outage",
  "maintenance",
  "informational",
  "not_monitored",
  "unknown",
]);

async function main() {
  const results = await Promise.allSettled(
    PROVIDERS.map(async (provider) => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(new Error("Timed out")), 8_000);

      try {
        const snapshot = await provider.adapter.fetch(controller.signal);
        validateSnapshot(snapshot, provider.id);
        const histories = await Promise.all(
          snapshot.components.map(async (component) => {
            if (component.history) return component.history;
            if (!provider.adapter.fetchComponentHistory) return undefined;
            const history = await provider.adapter.fetchComponentHistory(component.id, controller.signal);
            if (!history) throw new Error(`${component.name} did not publish component history`);
            return history;
          }),
        );
        const publishedHistories = histories.filter((history): history is ComponentHistory => Boolean(history));
        if (snapshot.components.length > 0 && publishedHistories.length === 0) {
          throw new Error("no component history could be read from the official source");
        }
        for (const history of publishedHistories) validateHistory(history);
        return {
          provider: provider.name,
          health:
            snapshot.health === "unknown" && !snapshot.statusText
              ? "No Overall Status"
              : providerStatusPresentation(snapshot).label,
          components: snapshot.components.length,
          incidents: snapshot.incidents.length,
          histories: publishedHistories.length,
          exactUptimes: publishedHistories.filter((history) => history.uptimeText !== undefined).length,
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown source error";
        throw new Error(`${provider.name}: ${message}`, { cause: error });
      } finally {
        clearTimeout(timeout);
      }
    }),
  );

  let failures = 0;
  for (const result of results) {
    if (result.status === "fulfilled") {
      const { provider, health, components, incidents, histories, exactUptimes } = result.value;
      console.log(
        `${provider}: ${health}; ${components} components; ${incidents} incidents; ${histories} histories; ${exactUptimes} exact uptimes`,
      );
    } else {
      failures += 1;
      console.error(result.reason instanceof Error ? result.reason.message : "Unknown source error");
    }
  }

  const passed = results.flatMap((result) => (result.status === "fulfilled" ? [result.value] : []));
  console.log(
    `Verified ${passed.length}/${PROVIDERS.length} providers; ${passed.reduce((sum, result) => sum + result.histories, 0)} component histories; ${passed.reduce((sum, result) => sum + result.exactUptimes, 0)} exact uptimes`,
  );

  if (failures > 0) process.exitCode = 1;
}

function validateSnapshot(snapshot: ProviderSnapshot, providerId: string): void {
  if (snapshot.providerId !== providerId) {
    throw new Error(`snapshot provider ID was ${snapshot.providerId || "missing"}; expected ${providerId}`);
  }
  if (!HEALTH_VALUES.has(snapshot.health)) throw new Error(`snapshot used unknown health ${snapshot.health}`);
  if (!validTimestamp(snapshot.fetchedAt)) throw new Error("snapshot fetchedAt was not a valid timestamp");

  const componentIds = snapshot.components.map((component) => component.id);
  if (componentIds.some((id) => !id) || new Set(componentIds).size !== componentIds.length) {
    throw new Error("component IDs were missing or duplicated");
  }
  for (const component of snapshot.components) {
    if (!component.name.trim()) throw new Error(`${component.id} had no component name`);
    if (!HEALTH_VALUES.has(component.health)) {
      throw new Error(`${component.name} used unknown health ${component.health}`);
    }
  }

  const incidentIds = snapshot.incidents.map((incident) => incident.id);
  if (incidentIds.some((id) => !id) || new Set(incidentIds).size !== incidentIds.length) {
    throw new Error("incident IDs were missing or duplicated");
  }
  for (const incident of snapshot.incidents) validateIncident(incident);
}

function validateIncident(incident: Incident): void {
  if (!incident.title.trim()) throw new Error(`${incident.id} had no incident title`);
  if (!HEALTH_VALUES.has(incident.health)) throw new Error(`${incident.title} used unknown health ${incident.health}`);
  if (!INCIDENT_STATE_VALUES.has(incident.state)) {
    throw new Error(`${incident.title} used unknown lifecycle state ${incident.state}`);
  }
  for (const [field, value] of [
    ["startedAt", incident.startedAt],
    ["updatedAt", incident.updatedAt],
    ["resolvedAt", incident.resolvedAt],
  ] as const) {
    if (value !== undefined && !validTimestamp(value)) throw new Error(`${incident.title} had an invalid ${field}`);
  }
  const updateIds = incident.updates.map((update) => update.id);
  if (updateIds.some((id) => !id) || new Set(updateIds).size !== updateIds.length) {
    throw new Error(`${incident.title} had missing or duplicate update IDs`);
  }
  for (const update of incident.updates) {
    if (!INCIDENT_STATE_VALUES.has(update.state) || !validTimestamp(update.createdAt) || !update.body.trim()) {
      throw new Error(`${incident.title} had a malformed incident update`);
    }
  }
}

function validateHistory(history: ComponentHistory): void {
  if (history.windowDays !== history.days.length || history.days.length === 0) {
    throw new Error("component history window did not match its published days");
  }
  const dates = history.days.map((day) => day.date);
  if (
    dates.some((date) => !/^\d{4}-\d{2}-\d{2}$/.test(date)) ||
    new Set(dates).size !== dates.length ||
    dates.some((date, index) => index > 0 && date <= dates[index - 1]!)
  ) {
    throw new Error("component history dates were duplicated or out of order");
  }
  for (let index = 1; index < dates.length; index += 1) {
    const previous = new Date(`${dates[index - 1]}T00:00:00Z`);
    previous.setUTCDate(previous.getUTCDate() + 1);
    if (previous.toISOString().slice(0, 10) !== dates[index]) {
      throw new Error("component history dates were not contiguous");
    }
  }
  if (history.days.some((day) => !HISTORY_LEVEL_VALUES.has(day.level))) {
    throw new Error("component history used an unknown severity level");
  }
  if (
    history.uptimePercent !== undefined &&
    (!Number.isFinite(history.uptimePercent) || history.uptimePercent < 0 || history.uptimePercent > 100)
  ) {
    throw new Error("component history uptime was outside the valid percentage range");
  }
  if (history.uptimeText !== undefined) {
    const match = /^\s*(\d+(?:\.\d+)?)%\s*$/.exec(history.uptimeText);
    if (
      !match ||
      history.uptimePercent === undefined ||
      Math.abs(Number(match[1]) - history.uptimePercent) > 0.000_001
    ) {
      throw new Error("component history source uptime text did not match its numeric value");
    }
  }
  if (history.monitoredSince !== undefined) {
    const monitoredSince = history.monitoredSince;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(monitoredSince)) {
      throw new Error("component history monitoredSince was not a date");
    }
    if (history.days.some((day) => day.date < monitoredSince && day.level !== "not_monitored")) {
      throw new Error("component history treated pre-monitoring dates as monitored");
    }
  }
}

function validTimestamp(value: string): boolean {
  return value.trim().length > 0 && Number.isFinite(Date.parse(value));
}

void main();
