import { listIntegrations, request } from "./client";
import { integrationPresetIcon, normalizedIntegrationUrl, registrableDomain } from "./integration-icons";
import type { Integration } from "./types";

export type DisplayIntegration = Integration & { logoDomain?: string | null };

/** Keep only branding metadata; never cache configuration headers or query parameters. */
async function displayIntegration(integration: Integration, signal: AbortSignal): Promise<DisplayIntegration> {
  if (integration.kind !== "openapi" || integrationPresetIcon(integration)) return integration;
  try {
    const config = await request<{ baseUrl?: string | null; specUrl?: string | null } | null>(
      `/api/openapi/integrations/${encodeURIComponent(integration.slug)}/config`,
      {},
      signal,
    );
    const displayUrl = normalizedIntegrationUrl(integration.displayUrl);
    const specUrl = normalizedIntegrationUrl(config?.specUrl);
    // A base URL is authoritative. A different display URL is Executor's saved
    // display domain; the specification URL itself cannot establish branding.
    const domain = config?.baseUrl
      ? registrableDomain(config.baseUrl)
      : config && displayUrl && (!config.specUrl || (specUrl && displayUrl !== specUrl))
        ? registrableDomain(displayUrl)
        : null;
    return { ...integration, logoDomain: domain };
  } catch {
    return { ...integration, logoDomain: null };
  }
}

/** All directory-backed views share the same workspace-scoped display metadata. */
export async function listDisplayIntegrations(signal = AbortSignal.timeout(15000)): Promise<DisplayIntegration[]> {
  const integrations = await listIntegrations(signal);
  return Promise.all(integrations.map((integration) => displayIntegration(integration, signal)));
}
