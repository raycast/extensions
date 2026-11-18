import { getAccessToken } from "./oauth";
import type { Organization, Service, ServiceLink } from "./types";

const API_URL = "https://api.qovery.com";

interface ResultsResponse<T> {
  results?: T[];
}

export class QoveryApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
  }
}

async function get<T>(path: string, allowInteractiveAuthentication = false): Promise<T> {
  const accessToken = await getAccessToken(allowInteractiveAuthentication);
  const response = await fetch(`${API_URL}${path}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => undefined)) as { message?: string; error?: string } | undefined;
    const message =
      body?.message ||
      body?.error ||
      (response.status === 401
        ? "Your Qovery session has expired. Sign out and sign in again."
        : `Qovery API request failed (${response.status})`);
    throw new QoveryApiError(message, response.status);
  }

  return (await response.json()) as T;
}

export async function listOrganizations(allowInteractiveAuthentication = false): Promise<Organization[]> {
  const data = await get<ResultsResponse<Organization>>("/organization", allowInteractiveAuthentication);
  return data.results ?? [];
}

async function listOrganizationServices(organization: Organization): Promise<Service[]> {
  const data = await get<ResultsResponse<Omit<Service, "organization_id" | "organization_name">>>(
    `/organization/${organization.id}/services`,
  );
  return (data.results ?? []).map((service) => ({
    ...service,
    organization_id: organization.id,
    organization_name: organization.name,
  }));
}

export async function listAllServices(): Promise<{
  organizations: Organization[];
  services: Service[];
  failedOrganizations: Organization[];
}> {
  const organizations = await listOrganizations(true);
  const results = await Promise.allSettled(organizations.map(listOrganizationServices));
  const services: Service[] = [];
  const failedOrganizations: Organization[] = [];

  results.forEach((result, index) => {
    if (result.status === "fulfilled") {
      services.push(...result.value);
    } else {
      failedOrganizations.push(organizations[index]);
    }
  });

  return { organizations, services, failedOrganizations };
}

export async function listServiceLinks(service: Service): Promise<ServiceLink[]> {
  const serviceType = service.service_type.toLowerCase();
  if (!supportsLinks(service)) {
    return [];
  }

  const data = await get<ResultsResponse<ServiceLink>>(`/${serviceType}/${service.id}/link`);
  return data.results ?? [];
}

export function supportsLinks(service: Service): boolean {
  return ["application", "container", "helm"].includes(service.service_type.toLowerCase());
}
