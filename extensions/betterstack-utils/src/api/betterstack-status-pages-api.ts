import { fetchAllPages, V2_BASE } from "@/api/betterstack-client";
import { asOptional, Optional } from "@/common/utils/optional-utils";
import { StatusPage, StatusPageState } from "@/domain/status-page";

export interface StatusPageApiData {
  id: string;
  type: "status_page";
  attributes: StatusPageApiAttributes;
}

export interface StatusPageApiAttributes {
  company_name?: Optional<string>;
  subdomain: string;
  custom_domain?: Optional<string>;
  aggregate_state?: Optional<string>;
}

const KNOWN_STATES = Object.values(StatusPageState);

export function buildStatusPageUrl(statusPage: StatusPage): string {
  const trimmedCustomDomain = statusPage.customDomain?.trim();

  return trimmedCustomDomain ? `https://${trimmedCustomDomain}` : `https://${statusPage.subdomain}.betteruptime.com`;
}

export async function listStatusPages(): Promise<StatusPage[]> {
  const params = new URLSearchParams({ per_page: "50" });
  const allStatusPages = await fetchAllPages<StatusPageApiData>(`${V2_BASE}/status-pages?${params}`);

  return allStatusPages.map(toStatusPage);
}

export function toStatusPage(data: StatusPageApiData): StatusPage {
  const { id, attributes } = data;

  return {
    id,
    name: attributes.company_name ?? attributes.subdomain,
    subdomain: attributes.subdomain,
    customDomain: asOptional(attributes.custom_domain),
    state: toStatusPageState(attributes.aggregate_state),
  };
}

function toStatusPageState(state: Optional<string>): StatusPageState {
  return KNOWN_STATES.find((knownState) => knownState === state) ?? StatusPageState.OPERATIONAL;
}
