import { fetchAllPages, V2_BASE, BASE_URL } from "@/api/betterstack-client";
import { asOptional, Optional } from "@/common/utils/optional-utils";
import { toList } from "@/common/utils/collection-utils";
import { Monitor, MonitorStatus } from "@/domain/monitor";

export interface MonitorApiData {
  id: string;
  type: "monitor";
  attributes: MonitorApiAttributes;
}

export interface MonitorApiAttributes {
  url: string;
  pronounceable_name?: Optional<string>;
  monitor_type?: Optional<string>;
  status?: Optional<string>;
  check_frequency?: Optional<number>;
  last_checked_at?: Optional<string>;
  created_at?: Optional<string>;
  http_method?: Optional<string>;
  request_timeout?: Optional<number>;
  recovery_period?: Optional<number>;
  regions?: Optional<string[]>;
  ssl_expiration?: Optional<number>;
  domain_expiration?: Optional<number>;
}

const KNOWN_STATUSES = Object.values(MonitorStatus);

export function buildMonitorWebUrl(monitorId: string, teamId: Optional<string>): string {
  const trimmedTeamId = teamId?.trim();

  return trimmedTeamId
    ? `${BASE_URL}/team/t${trimmedTeamId}/monitors/${monitorId}`
    : `${BASE_URL}/monitors/${monitorId}`;
}

export async function listMonitors(): Promise<Monitor[]> {
  const params = new URLSearchParams({ per_page: "50" });
  const allMonitors = await fetchAllPages<MonitorApiData>(`${V2_BASE}/monitors?${params}`);

  return allMonitors.map(toMonitor);
}

export function toMonitor(data: MonitorApiData): Monitor {
  const { id, attributes } = data;

  return {
    id,
    name: attributes.pronounceable_name ?? attributes.url,
    url: attributes.url,
    monitorType: asOptional(attributes.monitor_type),
    status: toMonitorStatus(attributes.status),
    checkFrequency: asOptional(attributes.check_frequency),
    lastCheckedAt: asOptional(attributes.last_checked_at),
    createdAt: asOptional(attributes.created_at),
    httpMethod: asOptional(attributes.http_method),
    requestTimeout: asOptional(attributes.request_timeout),
    recoveryPeriod: asOptional(attributes.recovery_period),
    regions: toList(attributes.regions),
    sslExpiration: asOptional(attributes.ssl_expiration),
    domainExpiration: asOptional(attributes.domain_expiration),
  };
}

function toMonitorStatus(status: Optional<string>): MonitorStatus {
  return KNOWN_STATUSES.find((knownStatus) => knownStatus === status) ?? MonitorStatus.PENDING;
}
