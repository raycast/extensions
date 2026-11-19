import {
  STATUS_PAGE_URL,
  affectedComponents,
  componentStatusLabel,
  fetchStatusSummary,
  incidentStartedAt,
  incidentURL,
  latestUpdate,
} from "../status/status-page";
import type { Incident } from "../status/types";

function describeIncident(incident: Incident) {
  const update = latestUpdate(incident);
  return {
    name: incident.name,
    status: incident.status,
    impact: incident.impact,
    startedAt: incidentStartedAt(incident),
    updatedAt: incident.updated_at,
    affectedComponents: incident.components.map((component) => component.name),
    latestUpdate: update ? { status: update.status, at: update.display_at, message: update.body } : undefined,
    url: incidentURL(incident),
  };
}

/**
 * Get the current status of Vercel's services from vercel-status.com: the overall status,
 * unresolved incidents with their latest update, scheduled maintenance and every component
 * that is not operational. Use it when the user asks whether Vercel is down, degraded or has an incident.
 */
export default async function getServiceStatus() {
  const summary = await fetchStatusSummary();
  return {
    overall: summary.status.description,
    indicator: summary.status.indicator,
    updatedAt: summary.page.updated_at,
    statusPage: STATUS_PAGE_URL,
    activeIncidents: summary.incidents.map(describeIncident),
    scheduledMaintenance: summary.scheduled_maintenances.map((maintenance) => ({
      ...describeIncident(maintenance),
      scheduledFor: maintenance.scheduled_for,
      scheduledUntil: maintenance.scheduled_until,
    })),
    affectedComponents: affectedComponents(summary).map(({ component, displayName }) => ({
      name: displayName,
      status: componentStatusLabel(component.status),
    })),
  };
}
