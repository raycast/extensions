export interface ApiErrorPayload {
  error: {
    code: string;
    message: string;
    field?: string;
  };
}

export interface Paginated<T> {
  data: T[];
  next: string | null;
}

export interface Project {
  id: string;
  organizationId: string;
  name: string;
  timezone: string;
  defaultLocationCount: number;
  suspendedAt: string | null;
  createdAt: string;
}

export interface OpenIncident {
  id: string;
  openedAt: string;
  acknowledgedAt: string | null;
  errorKind: string | null;
}

export interface Check {
  id: string;
  type: "uptime" | "performance" | "certificate" | "domain" | string;
  enabled: boolean;
  intervalSec: number;
  status: "pending" | "ok" | "warning" | "failed" | string;
  snoozedUntil: string | null;
  settings: { kind: string; [key: string]: unknown } | null;
  notApplicable: string | null;
  heartbeatDeadline: string | null;
  openIncident: OpenIncident | null;
  createdAt: string;
}

export interface Monitor {
  id: string;
  projectId: string;
  type: "http" | "tcp" | "ping" | "heartbeat" | string;
  name: string;
  description: string | null;
  target: string;
  locations: string[];
  standIns: Record<string, string>;
  state: "active" | "paused" | "suspended" | string;
  status: "pending" | "ok" | "warning" | "failed" | null;
  onStatusPage: boolean;
  ruleIds: string[];
  pausedAt: string | null;
  suspendedAt: string | null;
  createdAt: string;
  checks: Check[];
}

export interface Incident {
  id: string;
  monitorId: string;
  checkId: string;
  checkType: "uptime" | "performance" | "certificate" | "domain" | string;
  openedAt: string;
  resolvedAt: string | null;
  resolution: string | null;
  errorKind: string | null;
  flappingAt: string | null;
  causedBy: string | null;
  releasedAt: string | null;
  acknowledgedAt: string | null;
  acknowledgedSource: "member" | "alert" | "api_token" | null;
  acknowledgedBy: string | null;
  acknowledgedByTokenId: string | null;
  resolvedBy: string | null;
  resolvedByTokenId: string | null;
}

export interface RegionalOutage {
  id: string;
  monitorId: string;
  checkId: string;
  location: string;
  openedAt: string;
  resolvedAt: string | null;
  resolution: string | null;
  flappingAt: string | null;
}

export interface ProjectStatus {
  projectId: string;
  name: string;
  monitors: Monitor[];
  incidents: Incident[];
  regionalOutages: RegionalOutage[];
}

export interface StatusResponse {
  projects: ProjectStatus[];
}

export interface UptimeFigure {
  window: "24h" | "7d" | "30d" | "90d" | string;
  asOf: string;
  percentage: number | null;
  coveredSeconds: number;
  incidentSeconds: number;
  notMeasuredSeconds: number;
  notMeasuredHours: number;
}

export interface ProjectMonitorUptime {
  monitorId: string;
  window: UptimeFigure;
}

export interface MonitorUptime {
  monitorId: string;
  windows: UptimeFigure[];
}

export interface Run {
  id: string;
  checkId: string;
  location: string | null;
  startedAt: string;
  receivedAt: string;
  outcome: "ok" | "warning" | "failed" | "skipped_stale" | string;
  statusCode: number | null;
  errorKind: string | null;
  dnsMs: number | null;
  connectMs: number | null;
  tlsMs: number | null;
  ttfbMs: number | null;
  totalMs: number | null;
  bodyBytes: number | null;
  bodySnippet: string | null;
  watched: boolean;
}

export interface IncidentEvidence {
  incidentId: string;
  kept: boolean;
  keptDays: number;
  stoppingPoint: {
    sentence: string;
    detail: string;
    nextStep: string;
  } | null;
  locations: Array<{
    location: string;
    startedAt: string;
    errorKind: string | null;
    statusCode: number | null;
    totalMs: number | null;
  }>;
}
