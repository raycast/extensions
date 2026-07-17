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
