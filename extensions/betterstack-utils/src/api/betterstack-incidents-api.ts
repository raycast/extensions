import { request, V3_BASE, BASE_URL } from "@/api/betterstack-client";
import { asOptional, Optional } from "@/common/utils/optional-utils";
import { Incident, IncidentStatus } from "@/domain/incident";

export interface IncidentApiData {
  id: string;
  type: "incident";
  attributes: IncidentApiAttributes;
}

export interface IncidentApiAttributes {
  name?: Optional<string>;
  summary?: Optional<string>;
  cause?: Optional<string>;
  status?: Optional<string>;
  started_at: string;
  acknowledged_by?: Optional<string>;
  resolved_by?: Optional<string>;
}

export interface CreateIncidentInput {
  summary: string;
  description: Optional<string>;
  requesterEmail: Optional<string>;
  email: boolean;
  sms: boolean;
  call: boolean;
}

interface IncidentListResponse {
  data: IncidentApiData[];
  pagination?: { next?: string | null };
}

interface IncidentResponse {
  data: IncidentApiData;
}

const UNTITLED_INCIDENT = "Untitled incident";
const KNOWN_STATUSES = Object.values(IncidentStatus);

export function buildIncidentWebUrl(incidentId: string, teamId: Optional<string>): string {
  const trimmedTeamId = teamId?.trim();

  return trimmedTeamId
    ? `${BASE_URL}/team/t${trimmedTeamId}/incidents/${incidentId}`
    : `${BASE_URL}/incidents/${incidentId}`;
}

export async function createIncident(input: CreateIncidentInput): Promise<Incident> {
  const body = {
    summary: input.summary,
    description: input.description,
    requester_email: input.requesterEmail,
    email: input.email,
    sms: input.sms,
    call: input.call,
  };

  const response = await request<IncidentResponse>(`${V3_BASE}/incidents`, { method: "POST", body });

  return toIncident(response.data);
}

export async function listIncidents(options: { activeOnly: boolean }): Promise<Incident[]> {
  const params = new URLSearchParams({ per_page: "50" });
  if (options.activeOnly) params.set("resolved", "false");

  let url: Optional<string> = `${V3_BASE}/incidents?${params}`;
  const allIncidents: IncidentApiData[] = [];

  while (url) {
    const page: IncidentListResponse = await request<IncidentListResponse>(url);
    allIncidents.push(...page.data);
    url = asOptional(page.pagination?.next);
  }

  return allIncidents.map(toIncident);
}

export async function acknowledgeIncident(incidentId: string): Promise<void> {
  await request(`${V3_BASE}/incidents/${incidentId}/acknowledge`, { method: "POST" });
}

export async function resolveIncident(incidentId: string): Promise<void> {
  await request(`${V3_BASE}/incidents/${incidentId}/resolve`, { method: "POST" });
}

function toIncident(data: IncidentApiData): Incident {
  const { id, attributes } = data;

  return {
    id,
    name: attributes.name ?? UNTITLED_INCIDENT,
    summary: asOptional(attributes.summary),
    cause: asOptional(attributes.cause),
    status: toIncidentStatus(attributes.status),
    startedAt: attributes.started_at,
    acknowledgedBy: asOptional(attributes.acknowledged_by),
    resolvedBy: asOptional(attributes.resolved_by),
  };
}

function toIncidentStatus(status: Optional<string>): IncidentStatus {
  return KNOWN_STATUSES.find((knownStatus) => knownStatus === status) ?? IncidentStatus.Started;
}
