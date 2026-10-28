import { DateTime } from "luxon";
import { request, V2_BASE } from "@/api/betterstack-client";
import { Optional } from "@/common/utils/optional-utils";
import { MonitorSla } from "@/domain/monitor-sla";

export interface MonitorSlaApiData {
  id: string;
  type: "monitor_sla";
  attributes: MonitorSlaApiAttributes;
}

export interface MonitorSlaApiAttributes {
  availability?: Optional<number>;
  total_downtime?: Optional<number>;
  number_of_incidents?: Optional<number>;
  longest_incident?: Optional<number>;
  average_incident?: Optional<number>;
}

interface MonitorSlaResponse {
  data: MonitorSlaApiData;
}

export interface AvailabilityRange {
  from?: string;
  to?: string;
}

export interface AvailabilityWindow {
  label: string;
  range: AvailabilityRange;
}

export function buildAvailabilityWindows(now: DateTime, createdAt?: Optional<string>): AvailabilityWindow[] {
  const today = now.toISODate() ?? "";

  return [
    { label: "Today", range: { from: today, to: today } },
    { label: "Last 7 days", range: { from: now.minus({ days: 7 }).toISODate() ?? "", to: today } },
    { label: "Last 30 days", range: { from: now.minus({ days: 30 }).toISODate() ?? "", to: today } },
    { label: "Last 365 days", range: { from: now.minus({ days: 365 }).toISODate() ?? "", to: today } },
    { label: buildAllTimeLabel(now, createdAt), range: {} },
  ];
}

function buildAllTimeLabel(now: DateTime, createdAt: Optional<string>): string {
  const created = createdAt ? DateTime.fromISO(createdAt) : undefined;
  if (!created?.isValid) return "All time";

  const days = Math.floor(now.diff(created, "days").days);
  return `All time (Last ${days} days)`;
}

export async function getMonitorSla(monitorId: string, range: AvailabilityRange): Promise<MonitorSla> {
  const params = new URLSearchParams();
  if (range.from) params.set("from", range.from);
  if (range.to) params.set("to", range.to);

  const query = params.toString();
  const url = query ? `${V2_BASE}/monitors/${monitorId}/sla?${query}` : `${V2_BASE}/monitors/${monitorId}/sla`;

  const response = await request<MonitorSlaResponse>(url);

  return toMonitorSla(response.data);
}

export function toMonitorSla(data: MonitorSlaApiData): MonitorSla {
  const { attributes } = data;

  return {
    availability: attributes.availability ?? 0,
    totalDowntime: attributes.total_downtime ?? 0,
    numberOfIncidents: attributes.number_of_incidents ?? 0,
    longestIncident: attributes.longest_incident ?? 0,
    averageIncident: attributes.average_incident ?? 0,
  };
}
