import { Color, Icon, type Image } from "@raycast/api";
import type { Check, Monitor } from "./types";

export const DASHBOARD_ORIGIN = "https://app.uup.dev";

export const SNOOZE_PRESETS: ReadonlyArray<{ label: string; minutes: number }> = [
  { label: "30 Minutes", minutes: 30 },
  { label: "1 Hour", minutes: 60 },
  { label: "4 Hours", minutes: 240 },
  { label: "24 Hours", minutes: 1440 },
];

export function monitorDashboardUrl(projectId: string, monitorId: string): string {
  return `${DASHBOARD_ORIGIN}/projects/${projectId}/monitors/${monitorId}`;
}

export function incidentDashboardUrl(projectId: string, monitorId: string, incidentId: string): string {
  return `${DASHBOARD_ORIGIN}/projects/${projectId}/monitors/${monitorId}/events#${incidentId}`;
}

export function monitorStatusIcon(monitor: Monitor): Image.ImageLike {
  if (monitor.state === "paused") {
    return { source: Icon.Pause, tintColor: Color.SecondaryText };
  }
  if (monitor.state === "suspended") {
    return { source: Icon.Stop, tintColor: Color.SecondaryText };
  }
  switch (monitor.status) {
    case "ok":
      return { source: Icon.CheckCircle, tintColor: Color.Green };
    case "warning":
      return { source: Icon.ExclamationMark, tintColor: Color.Yellow };
    case "failed":
      return { source: Icon.XMarkCircle, tintColor: Color.Red };
    case "pending":
      return { source: Icon.Clock, tintColor: Color.Blue };
    default:
      return { source: Icon.Circle, tintColor: Color.SecondaryText };
  }
}

export function monitorStatusLabel(monitor: Monitor): { text: string; color: Color } {
  if (monitor.state === "paused") return { text: "Paused", color: Color.SecondaryText };
  if (monitor.state === "suspended") return { text: "Suspended", color: Color.SecondaryText };
  switch (monitor.status) {
    case "ok":
      return { text: "Up", color: Color.Green };
    case "warning":
      return { text: "Warning", color: Color.Yellow };
    case "failed":
      return { text: "Down", color: Color.Red };
    case "pending":
      return { text: "Waiting", color: Color.Blue };
    default:
      return { text: "Off", color: Color.SecondaryText };
  }
}

export function monitorTypeLabel(type: string): string {
  switch (type) {
    case "http":
      return "HTTP";
    case "tcp":
      return "TCP";
    case "ping":
      return "Ping";
    case "heartbeat":
      return "Heartbeat";
    default:
      return type.toUpperCase();
  }
}

export function checkTypeLabel(type: string): string {
  switch (type) {
    case "uptime":
      return "Uptime";
    case "performance":
      return "Response time";
    case "certificate":
      return "Certificate";
    case "domain":
      return "Domain";
    default:
      return type;
  }
}

const ERROR_KIND_LABELS: Record<string, string> = {
  dns_failure: "DNS lookup failed",
  address_refused: "Address refused",
  connection_refused: "Connection refused",
  connection_reset: "Connection reset",
  timeout: "Timed out",
  tls_handshake_failed: "TLS connection failed",
  certificate_expired: "Certificate expired",
  certificate_invalid: "Certificate invalid",
  domain_expired: "Domain expired",
  registry_unreadable: "Domain registry unreadable",
  no_signal: "Heartbeat missed its deadline",
  redirect_downgrade: "Redirect downgraded to HTTP",
  too_many_redirects: "Too many redirects",
  redirect_invalid: "Invalid redirect",
  port_blocked: "Port blocked",
  unexpected_status: "Unexpected HTTP status",
  keyword_missing: "Expected body text missing",
  keyword_present: "Unwanted body text present",
  json_mismatch: "JSON assertion did not match",
  json_invalid: "Invalid JSON response",
  body_truncated: "Response body exceeded limit",
  read_failed: "Failed reading response",
  no_reply: "No ping reply",
  packet_loss: "Packet loss",
  probe_unavailable: "Probe unavailable",
  unreachable: "Target unreachable",
};

export function formatErrorKind(errorKind: string | null): string {
  if (!errorKind) return "Check failed";
  return ERROR_KIND_LABELS[errorKind] ?? errorKind.replaceAll("_", " ");
}

export function formatUptimePercent(percentage: number | null | undefined): string {
  if (percentage === null || percentage === undefined) return "—";
  const pct = percentage * 100;
  if (pct === 100) return "100%";
  if (pct >= 99.99) return `${pct.toFixed(3)}%`;
  return `${pct.toFixed(2)}%`;
}

export function formatRelativeTime(iso: string): string {
  const diffSec = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
  if (diffSec < 0) {
    const ahead = Math.abs(diffSec);
    if (ahead < 60) return `in ${ahead}s`;
    if (ahead < 3600) return `in ${Math.floor(ahead / 60)}m`;
    if (ahead < 86400) return `in ${Math.floor(ahead / 3600)}h`;
    return `in ${Math.floor(ahead / 86400)}d`;
  }
  if (diffSec < 60) return `${diffSec}s ago`;
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
  return `${Math.floor(diffSec / 86400)}d ago`;
}

export function formatDurationBetween(startIso: string, endIso: string | null): string {
  const endMs = endIso ? new Date(endIso).getTime() : Date.now();
  const totalSec = Math.max(0, Math.round((endMs - new Date(startIso).getTime()) / 1000));
  if (totalSec < 60) return `${totalSec}s`;
  const mins = Math.floor(totalSec / 60);
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  const remMins = mins % 60;
  if (hours < 24) return remMins > 0 ? `${hours}h ${remMins}m` : `${hours}h`;
  const days = Math.floor(hours / 24);
  const remHours = hours % 24;
  return remHours > 0 ? `${days}d ${remHours}h` : `${days}d`;
}

export function activeSnoozedChecks(monitor: Monitor): Check[] {
  const now = Date.now();
  return monitor.checks.filter(
    (check) => check.enabled && check.snoozedUntil !== null && new Date(check.snoozedUntil).getTime() > now,
  );
}

export function primaryCheckOf(monitor: Monitor): Check | undefined {
  return monitor.checks.find((c) => c.type === "uptime" && c.enabled) ?? monitor.checks.find((c) => c.enabled);
}

export function openIncidentsOnMonitor(
  monitor: Monitor,
): Array<{ check: Check; incidentId: string; acknowledged: boolean }> {
  const list: Array<{ check: Check; incidentId: string; acknowledged: boolean }> = [];
  for (const check of monitor.checks) {
    if (check.openIncident) {
      list.push({
        check,
        incidentId: check.openIncident.id,
        acknowledged: check.openIncident.acknowledgedAt !== null,
      });
    }
  }
  return list;
}

export function untilMinutesFromNow(minutes: number): string {
  return new Date(Date.now() + minutes * 60 * 1000).toISOString();
}
