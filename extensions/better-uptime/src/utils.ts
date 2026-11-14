import type { Response } from "node-fetch";
import { IncidentItem, MonitorItem } from "./interface";

export function ucfirst(text: string) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function formatDateTime(dateString: string | null) {
  if (!dateString) return "-";
  return new Date(dateString).toLocaleString();
}

export function getIncidentDuration(item: IncidentItem) {
  const start = new Date(item.attributes.started_at);
  const end = item.attributes.resolved_at ? new Date(item.attributes.resolved_at) : new Date();
  const diffMs = end.getTime() - start.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffDays > 0) return `${diffDays}d ${diffHours % 24}h`;
  if (diffHours > 0) return `${diffHours}h ${diffMins % 60}m`;
  return `${diffMins}m`;
}

export function getMonitorFrequency(item: MonitorItem) {
  return item.attributes.check_frequency > 60
    ? `${item.attributes.check_frequency / 60} minutes`
    : item.attributes.check_frequency === 60
      ? `${item.attributes.check_frequency / 60} minute`
      : `${item.attributes.check_frequency} seconds`;
}

export function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

export async function getResponseErrorMessage(response: Response) {
  const fallback = `${response.status} ${response.statusText}`.trim();

  try {
    const { errors } = (await response.json()) as { errors?: unknown };
    return formatApiErrors(errors) || fallback;
  } catch {
    return fallback;
  }
}

// The API returns errors as a string, a list, or messages keyed by field (e.g. { "base": ["URL is invalid."] })
function formatApiErrors(errors: unknown) {
  if (typeof errors === "string") return errors;
  if (Array.isArray(errors)) return errors.join(", ");
  if (errors && typeof errors === "object") {
    return Object.entries(errors)
      .map(([field, messages]) => {
        const message = [messages].flat().join(", ");
        return field === "base" ? message : `${field}: ${message}`;
      })
      .join("; ");
  }
  return "";
}
