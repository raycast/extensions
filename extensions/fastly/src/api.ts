import {
  FastlyCustomer,
  FastlyService,
  FastlyServiceDetails,
  FastlyStats,
  FastlyInvitationResponse,
  FastlyInvitationRequest,
  InviteTeamMemberParams,
  KVStoreListResponse,
  KVStoreKeysResponse,
  ComputeACLListResponse,
  ComputeACLEntriesResponse,
  ComputeACLBulkEntry,
  SecretStoreListResponse,
  SecretStoreSecretsResponse,
  ConfigStoreListResponse,
  ConfigStoreItem,
  AuditEvent,
  AuditEventListResponse,
  AuditEventFilters,
  ArcProvidersResponse,
  ArcVirtualKeysResponse,
  ArcVirtualKey,
  ArcVirtualKeyWithToken,
  CreateArcVirtualKeyParams,
  UpdateArcVirtualKeyParams,
  ArcProviderConnection,
  ArcProviderConnectionsResponse,
  CreateArcProviderConnectionParams,
  UpdateArcProviderConnectionParams,
  ArcUsageMetricsResponse,
  ArcSessionsResponse,
  ArcTimeRangeFilters,
  ArcKeyFailover,
  BotManagementStatus,
  BotManagementEnabledServicesResponse,
  BotStats,
  DdosProtectionConfiguration,
  DdosEventsResponse,
  DdosProtectionRule,
  DdosRulesResponse,
  DdosStats,
  TlsCertificate,
  TlsSubscription,
  TlsListResponse,
  AlertDefinition,
  AlertHistoryEntry,
  AlertListResponse,
  RealtimeResponse,
  ServiceVersion,
} from "./types";
import { getPreferenceValues } from "@raycast/api";

const FASTLY_API_ENDPOINT = "https://api.fastly.com";

// Typed API error so callers can branch on the HTTP status instead of
// parsing it back out of the message text.
export class FastlyApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "FastlyApiError";
  }
}

// Cache for customer ID
let cachedCustomerId: string | null = null;

async function fastlyFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const preferences = getPreferenceValues<Preferences>();

  try {
    const response = await fetch(`${FASTLY_API_ENDPOINT}${path}`, {
      ...options,
      headers: {
        "Fastly-Key": preferences.apiToken,
        Accept: "application/json",
        "Content-Type": "application/json",
        ...options.headers,
      },
    });

    if (response.status === 401) {
      throw new Error("Invalid API token. Please check your Fastly API token in preferences.");
    }

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage;
      try {
        const errorJson = JSON.parse(errorText);
        errorMessage = errorJson.detail || errorJson.msg || errorText;
      } catch {
        errorMessage = errorText;
      }
      throw new FastlyApiError(
        `Fastly API error: ${response.statusText} (${response.status}) - ${errorMessage}`,
        response.status,
      );
    }

    // Only try to parse JSON if there's a response body
    if (response.status === 204) {
      return {} as T;
    }
    const text = await response.text();
    if (!text) {
      return {} as T;
    }
    return JSON.parse(text) as T;
  } catch (error) {
    console.error("Fastly API error:", error);
    throw error;
  }
}

async function getCustomerId(): Promise<string> {
  if (cachedCustomerId) {
    return cachedCustomerId;
  }

  try {
    const customer = await fastlyFetch<FastlyCustomer>("/current_customer");

    const customerId = customer.id;

    if (!customerId) {
      throw new Error("No customer ID found.");
    }

    cachedCustomerId = customerId;
    return cachedCustomerId;
  } catch (error) {
    console.error("Error fetching customer ID:", error);
    throw new Error(`Failed to fetch customer ID: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}

export async function getServices(): Promise<FastlyService[]> {
  const services = await fastlyFetch<FastlyService[]>("/service");
  return services;
}

export async function getServiceDetails(id: string): Promise<FastlyServiceDetails> {
  const details = await fastlyFetch<{
    service: FastlyService;
    active_version: number;
    versions: FastlyServiceDetails["versions"];
  }>(`/service/${id}/details`);

  return {
    ...details.service,
    active_version: details.active_version,
    versions: details.versions || [],
  };
}

export async function getServiceDomains(serviceId: string): Promise<string[]> {
  try {
    const details = await fastlyFetch<{
      versions: Array<{
        number: number;
        active: boolean;
      }>;
    }>(`/service/${serviceId}/details`);

    // Find the active version
    const activeVersion = details.versions.find((v) => v.active);
    if (!activeVersion) {
      console.log(`No active version found for service ${serviceId}`);
      return [];
    }

    // Use the active version number to fetch domains
    const domains = await fastlyFetch<Array<{ name: string }>>(
      `/service/${serviceId}/version/${activeVersion.number}/domain`,
    );

    return domains.map((domain) => domain.name);
  } catch (error) {
    console.error(`Error fetching domains for service ${serviceId}:`, error);
    return [];
  }
}

export async function getServiceStats(serviceId: string, serviceType: string): Promise<FastlyStats> {
  try {
    const now = new Date();
    const from = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const fromStr = from.toISOString();
    const toStr = now.toISOString();

    const response = await fastlyFetch<{
      data: Array<{
        compute_requests?: number;
        compute_execution_time_ms?: number;
        compute_request_time_ms?: number;
        compute_resp_status_2xx?: number;
        compute_resp_status_4xx?: number;
        compute_resp_status_5xx?: number;
        // CDN stats
        requests?: number;
        status_2xx?: number;
        status_4xx?: number;
        status_5xx?: number;
        hits?: number;
        miss?: number;
        errors?: number;
        bandwidth?: number;
      }>;
    }>(`/stats/service/${serviceId}?from=${fromStr}&to=${toStr}&by=hour`);

    if (!response.data || response.data.length === 0) {
      return {};
    }

    // Aggregate the stats
    const aggregated = response.data.reduce((acc, hour) => {
      if (serviceType?.toLowerCase() === "wasm") {
        // For Compute services
        return {
          requests: (acc.requests || 0) + (hour.compute_requests || 0),
          compute_requests: (acc.compute_requests || 0) + (hour.compute_requests || 0),
          compute_execution_time_ms: (acc.compute_execution_time_ms || 0) + (hour.compute_execution_time_ms || 0),
          errors: (acc.errors || 0) + ((hour.compute_resp_status_4xx || 0) + (hour.compute_resp_status_5xx || 0)),
          status_2xx: (acc.status_2xx || 0) + (hour.compute_resp_status_2xx || 0),
          status_4xx: (acc.status_4xx || 0) + (hour.compute_resp_status_4xx || 0),
          status_5xx: (acc.status_5xx || 0) + (hour.compute_resp_status_5xx || 0),
        };
      } else {
        // For CDN services
        return {
          requests: (acc.requests || 0) + (hour.requests || 0),
          hits: (acc.hits || 0) + (hour.hits || 0),
          miss: (acc.miss || 0) + (hour.miss || 0),
          errors: (acc.errors || 0) + (hour.errors || 0),
          status_2xx: (acc.status_2xx || 0) + (hour.status_2xx || 0),
          status_4xx: (acc.status_4xx || 0) + (hour.status_4xx || 0),
          status_5xx: (acc.status_5xx || 0) + (hour.status_5xx || 0),
          bandwidth: (acc.bandwidth || 0) + (hour.bandwidth || 0),
        };
      }
    }, {} as FastlyStats);

    return aggregated;
  } catch (error) {
    console.error(`Failed to fetch stats for service ${serviceId}:`, error);
    return {};
  }
}

export async function purgeCache(serviceId: string): Promise<void> {
  await fastlyFetch(`/service/${serviceId}/purge_all`, {
    method: "POST",
  });
}

export async function inviteTeamMember(values: InviteTeamMemberParams): Promise<FastlyInvitationResponse> {
  try {
    const customerId = await getCustomerId();

    const payload: FastlyInvitationRequest = {
      data: {
        type: "invitation",
        attributes: {
          email: values.email.toLowerCase().trim(),
          limit_services: false,
          role: values.role,
          status_code: null,
        },
        relationships: {
          customer: {
            data: {
              type: "customer",
              id: customerId,
            },
          },
          service_invitations: {
            data: [],
          },
        },
      },
    };

    return await fastlyFetch<FastlyInvitationResponse>("/invitations", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  } catch (error) {
    console.error("Fastly API error:", error);
    throw new Error(
      `Failed to invite team member. ${error instanceof Error ? error.message : "Please check your API token and request."}`,
    );
  }
}

export async function createService(values: { name: string; domain: string; origin: string }): Promise<{ id: string }> {
  // Create CDN service
  const serviceResponse = await fastlyFetch<{ data: { id: string } }>("/services", {
    method: "POST",
    body: JSON.stringify({
      data: {
        type: "service",
        attributes: {
          name: values.name,
        },
      },
    }),
  });

  const serviceId = serviceResponse.data.id;

  try {
    // Create a new version
    const versionResponse = await fastlyFetch<{ number: number }>(`/service/${serviceId}/version`, {
      method: "POST",
    });

    const versionNumber = versionResponse.number;

    // CDN Service setup
    await fastlyFetch(`/service/${serviceId}/version/${versionNumber}/backend`, {
      method: "POST",
      body: JSON.stringify({
        name: "origin",
        address: values.origin,
        port: 443,
        use_ssl: true,
        ssl_check_cert: false,
        auto_loadbalance: false,
      }),
    });

    await fastlyFetch(`/service/${serviceId}/version/${versionNumber}/domain`, {
      method: "POST",
      body: JSON.stringify({
        name: values.domain,
        comment: "Created via Raycast",
      }),
    });

    // Activate the version
    await fastlyFetch(`/service/${serviceId}/version/${versionNumber}/activate`, {
      method: "PUT",
    });

    return { id: serviceId };
  } catch (error) {
    console.error("Configuration error:", error);
    throw error;
  }
}

// Export the getCustomerId function in case it's needed elsewhere
export { getCustomerId };

// Raw fetch for KV store values (returns text, not JSON)
async function fastlyFetchRaw(path: string, options: RequestInit = {}): Promise<Response> {
  const preferences = getPreferenceValues<Preferences>();

  const response = await fetch(`${FASTLY_API_ENDPOINT}${path}`, {
    ...options,
    headers: {
      "Fastly-Key": preferences.apiToken,
      ...options.headers,
    },
  });

  if (response.status === 401) {
    throw new Error("Invalid API token. Please check your Fastly API token in preferences.");
  }

  if (!response.ok) {
    const errorText = await response.text();
    let errorMessage;
    try {
      const errorJson = JSON.parse(errorText);
      errorMessage = errorJson.detail || errorJson.msg || errorText;
    } catch {
      errorMessage = errorText;
    }
    throw new FastlyApiError(
      `Fastly API error: ${response.statusText} (${response.status}) - ${errorMessage}`,
      response.status,
    );
  }

  return response;
}

// KV Store API functions

export async function getKVStores(cursor?: string): Promise<KVStoreListResponse> {
  const params = new URLSearchParams();
  if (cursor) params.set("cursor", cursor);
  const query = params.toString();
  return fastlyFetch<KVStoreListResponse>(`/resources/stores/kv${query ? `?${query}` : ""}`);
}

export async function deleteKVStore(storeId: string): Promise<void> {
  await fastlyFetch(`/resources/stores/kv/${storeId}`, { method: "DELETE" });
}

export async function getKVStoreKeys(storeId: string, cursor?: string): Promise<KVStoreKeysResponse> {
  const params = new URLSearchParams();
  if (cursor) params.set("cursor", cursor);
  const query = params.toString();
  return fastlyFetch<KVStoreKeysResponse>(`/resources/stores/kv/${storeId}/keys${query ? `?${query}` : ""}`);
}

export async function getKVStoreKeyValue(storeId: string, keyName: string): Promise<string> {
  const response = await fastlyFetchRaw(`/resources/stores/kv/${storeId}/keys/${encodeURIComponent(keyName)}`);
  return response.text();
}

export async function setKVStoreKeyValue(storeId: string, keyName: string, value: string): Promise<void> {
  await fastlyFetchRaw(`/resources/stores/kv/${storeId}/keys/${encodeURIComponent(keyName)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/octet-stream" },
    body: value,
  });
}

export async function deleteKVStoreKey(storeId: string, keyName: string): Promise<void> {
  await fastlyFetchRaw(`/resources/stores/kv/${storeId}/keys/${encodeURIComponent(keyName)}`, {
    method: "DELETE",
  });
}

// ACL API functions (Compute/Edge ACLs via /resources/acls)

export async function getComputeACLs(): Promise<ComputeACLListResponse> {
  return fastlyFetch<ComputeACLListResponse>("/resources/acls");
}

export async function getComputeACLEntries(aclId: string, cursor?: string): Promise<ComputeACLEntriesResponse> {
  const params = new URLSearchParams();
  if (cursor) params.set("cursor", cursor);
  const query = params.toString();
  return fastlyFetch<ComputeACLEntriesResponse>(`/resources/acls/${aclId}/entries${query ? `?${query}` : ""}`);
}

export async function updateComputeACLEntries(aclId: string, entries: ComputeACLBulkEntry[]): Promise<void> {
  await fastlyFetch(`/resources/acls/${aclId}/entries`, {
    method: "PATCH",
    body: JSON.stringify({ entries }),
  });
}

export async function deleteComputeACL(aclId: string): Promise<void> {
  await fastlyFetch(`/resources/acls/${aclId}`, { method: "DELETE" });
}

// Secret Store API functions

export async function getSecretStores(cursor?: string): Promise<SecretStoreListResponse> {
  const params = new URLSearchParams();
  if (cursor) params.set("cursor", cursor);
  const query = params.toString();
  return fastlyFetch<SecretStoreListResponse>(`/resources/stores/secret${query ? `?${query}` : ""}`);
}

export async function deleteSecretStore(storeId: string): Promise<void> {
  await fastlyFetch(`/resources/stores/secret/${storeId}`, { method: "DELETE" });
}

export async function getSecretStoreSecrets(storeId: string, cursor?: string): Promise<SecretStoreSecretsResponse> {
  const params = new URLSearchParams();
  if (cursor) params.set("cursor", cursor);
  const query = params.toString();
  return fastlyFetch<SecretStoreSecretsResponse>(
    `/resources/stores/secret/${storeId}/secrets${query ? `?${query}` : ""}`,
  );
}

export async function createSecret(storeId: string, name: string, secret: string): Promise<void> {
  await fastlyFetch(`/resources/stores/secret/${storeId}/secrets`, {
    method: "POST",
    body: JSON.stringify({ name, secret }),
  });
}

export async function recreateSecret(storeId: string, name: string, secret: string): Promise<void> {
  await fastlyFetch(`/resources/stores/secret/${storeId}/secrets`, {
    method: "PATCH",
    body: JSON.stringify({ name, secret }),
  });
}

export async function deleteSecret(storeId: string, name: string): Promise<void> {
  await fastlyFetch(`/resources/stores/secret/${storeId}/secrets/${encodeURIComponent(name)}`, {
    method: "DELETE",
  });
}

// Config Store API functions

export async function getConfigStores(): Promise<ConfigStoreListResponse> {
  return fastlyFetch<ConfigStoreListResponse>("/resources/stores/config");
}

export async function deleteConfigStore(storeId: string): Promise<void> {
  await fastlyFetch(`/resources/stores/config/${storeId}`, { method: "DELETE" });
}

export async function getConfigStoreItems(storeId: string): Promise<ConfigStoreItem[]> {
  // The items endpoint may return a plain array or an object wrapper
  const response = await fastlyFetch<ConfigStoreItem[] | { data: ConfigStoreItem[] }>(
    `/resources/stores/config/${storeId}/items`,
  );
  if (Array.isArray(response)) {
    return response;
  }
  if (response && Array.isArray(response.data)) {
    return response.data;
  }
  return [];
}

export async function getConfigStoreItem(storeId: string, key: string): Promise<ConfigStoreItem> {
  return fastlyFetch<ConfigStoreItem>(`/resources/stores/config/${storeId}/item/${encodeURIComponent(key)}`);
}

export async function createConfigStoreItem(storeId: string, key: string, value: string): Promise<ConfigStoreItem> {
  return fastlyFetch<ConfigStoreItem>(`/resources/stores/config/${storeId}/item`, {
    method: "POST",
    body: JSON.stringify({ item_key: key, item_value: value }),
  });
}

export async function updateConfigStoreItem(storeId: string, key: string, value: string): Promise<ConfigStoreItem> {
  return fastlyFetch<ConfigStoreItem>(`/resources/stores/config/${storeId}/item/${encodeURIComponent(key)}`, {
    method: "PUT",
    body: JSON.stringify({ item_value: value }),
  });
}

export async function deleteConfigStoreItem(storeId: string, key: string): Promise<void> {
  await fastlyFetch(`/resources/stores/config/${storeId}/item/${encodeURIComponent(key)}`, {
    method: "DELETE",
  });
}

// Audit Log / Events API functions

export async function getEvents(filters: AuditEventFilters = {}): Promise<AuditEventListResponse> {
  const params = new URLSearchParams();

  if (filters.event_type) params.set("filter[event_type]", filters.event_type);
  if (filters.service_id) params.set("filter[service_id]", filters.service_id);
  if (filters.user_id) params.set("filter[user_id]", filters.user_id);
  if (filters.created_at_start) params.set("filter[created_at][gte]", filters.created_at_start);
  if (filters.created_at_end) params.set("filter[created_at][lte]", filters.created_at_end);
  if (filters.page) params.set("page[number]", String(filters.page));
  if (filters.per_page) params.set("page[size]", String(filters.per_page));

  const query = params.toString();
  return fastlyFetch<AuditEventListResponse>(`/events${query ? `?${query}` : ""}`);
}

export async function getEvent(eventId: string): Promise<{ data: AuditEvent }> {
  return fastlyFetch<{ data: AuditEvent }>(`/events/${eventId}`);
}

// AI Runtime Control (ARC) API functions
// Admin endpoints live on api.fastly.com and use the standard Fastly API token.
// Accounts without the AI Runtime Control entitlement receive a 403.

const ARC_BASE = "/ai-runtime-control/v1";

export function isArcNotEntitledError(error: unknown): boolean {
  return error instanceof FastlyApiError && error.status === 403;
}

function buildQuery(filters: ArcTimeRangeFilters): string {
  const params = new URLSearchParams();
  if (filters.key) params.set("key", filters.key);
  if (filters.provider) params.set("provider", filters.provider);
  if (filters.model) params.set("model", filters.model);
  if (filters.from) params.set("from", filters.from);
  if (filters.to) params.set("to", filters.to);
  if (filters.cursor) params.set("cursor", filters.cursor);
  if (filters.limit) params.set("limit", String(filters.limit));
  if (filters.sort) params.set("sort", filters.sort);
  const query = params.toString();
  return query ? `?${query}` : "";
}

export async function getArcProviders(): Promise<ArcProvidersResponse> {
  const response = await fastlyFetch<ArcProvidersResponse>(`${ARC_BASE}/providers`);
  // The API returns providers in a non-deterministic order; sort for stable dropdowns
  const data = [...(response.data || [])].sort((a, b) => a.display_name.localeCompare(b.display_name));
  for (const provider of data) {
    provider.models = [...(provider.models || [])].sort((a, b) => a.display_name.localeCompare(b.display_name));
  }
  return { ...response, data };
}

export async function getArcVirtualKeys(
  options: {
    cursor?: string;
    search?: string;
    limit?: number;
  } = {},
): Promise<ArcVirtualKeysResponse> {
  const params = new URLSearchParams();
  params.set("limit", String(options.limit ?? 100));
  params.set("sort", "-created_at");
  if (options.cursor) params.set("cursor", options.cursor);
  if (options.search) params.set("search", options.search);
  return fastlyFetch<ArcVirtualKeysResponse>(`${ARC_BASE}/keys?${params.toString()}`);
}

export async function createArcVirtualKey(values: CreateArcVirtualKeyParams): Promise<ArcVirtualKeyWithToken> {
  return fastlyFetch<ArcVirtualKeyWithToken>(`${ARC_BASE}/keys`, {
    method: "POST",
    body: JSON.stringify(values),
  });
}

export async function updateArcVirtualKey(keyId: string, values: UpdateArcVirtualKeyParams): Promise<ArcVirtualKey> {
  return fastlyFetch<ArcVirtualKey>(`${ARC_BASE}/keys/${keyId}`, {
    method: "PATCH",
    body: JSON.stringify(values),
  });
}

export async function deleteArcVirtualKey(keyId: string): Promise<void> {
  await fastlyFetch(`${ARC_BASE}/keys/${keyId}`, { method: "DELETE" });
}

export async function rotateArcVirtualKey(keyId: string, expiresAt: string): Promise<ArcVirtualKeyWithToken> {
  return fastlyFetch<ArcVirtualKeyWithToken>(`${ARC_BASE}/keys/${keyId}/rotate`, {
    method: "POST",
    body: JSON.stringify({ expires_at: expiresAt }),
  });
}

export function isArcNotFoundError(error: unknown): boolean {
  return error instanceof FastlyApiError && error.status === 404;
}

// Failover policies are feature-flagged; a 404 means the account isn't enrolled.
export async function getArcKeyFailover(keyId: string): Promise<ArcKeyFailover | null> {
  try {
    return await fastlyFetch<ArcKeyFailover>(`${ARC_BASE}/keys/${keyId}/failover`);
  } catch (error) {
    if (isArcNotFoundError(error)) {
      return null;
    }
    throw error;
  }
}

export async function putArcKeyFailover(keyId: string, failover: ArcKeyFailover): Promise<ArcKeyFailover> {
  return fastlyFetch<ArcKeyFailover>(`${ARC_BASE}/keys/${keyId}/failover`, {
    method: "PUT",
    body: JSON.stringify(failover),
  });
}

export async function getArcProviderConnections(cursor?: string): Promise<ArcProviderConnectionsResponse> {
  const params = new URLSearchParams();
  params.set("limit", "100");
  if (cursor) params.set("cursor", cursor);
  return fastlyFetch<ArcProviderConnectionsResponse>(`${ARC_BASE}/provider-connections?${params.toString()}`);
}

export async function createArcProviderConnection(
  values: CreateArcProviderConnectionParams,
): Promise<ArcProviderConnection> {
  return fastlyFetch<ArcProviderConnection>(`${ARC_BASE}/provider-connections`, {
    method: "POST",
    body: JSON.stringify(values),
  });
}

export async function updateArcProviderConnection(
  connectionId: string,
  values: UpdateArcProviderConnectionParams,
): Promise<ArcProviderConnection> {
  return fastlyFetch<ArcProviderConnection>(`${ARC_BASE}/provider-connections/${connectionId}`, {
    method: "PATCH",
    body: JSON.stringify(values),
  });
}

export async function deleteArcProviderConnection(connectionId: string): Promise<void> {
  await fastlyFetch(`${ARC_BASE}/provider-connections/${connectionId}`, { method: "DELETE" });
}

export async function getArcUsageMetrics(filters: ArcTimeRangeFilters = {}): Promise<ArcUsageMetricsResponse> {
  return fastlyFetch<ArcUsageMetricsResponse>(`${ARC_BASE}/usage-metrics${buildQuery(filters)}`);
}

export async function getArcSessions(filters: ArcTimeRangeFilters = {}): Promise<ArcSessionsResponse> {
  return fastlyFetch<ArcSessionsResponse>(`${ARC_BASE}/sessions${buildQuery(filters)}`);
}

// Bot Management API functions
// Product enablement endpoints; a 404 on the status endpoint means the
// product is not enabled on that service.

const BOT_MANAGEMENT_BASE = "/enabled-products/v1/bot_management";

export async function getBotManagementEnabledServices(): Promise<string[]> {
  const response = await fastlyFetch<BotManagementEnabledServicesResponse>(`${BOT_MANAGEMENT_BASE}/services`);
  return (response.services || []).map((service) => (typeof service === "string" ? service : service.id));
}

export async function enableBotManagement(serviceId: string): Promise<BotManagementStatus> {
  return fastlyFetch<BotManagementStatus>(`${BOT_MANAGEMENT_BASE}/services/${serviceId}`, { method: "PUT" });
}

export async function disableBotManagement(serviceId: string): Promise<void> {
  await fastlyFetch(`${BOT_MANAGEMENT_BASE}/services/${serviceId}`, { method: "DELETE" });
}

export async function getBotManagementConfiguration(serviceId: string): Promise<BotManagementStatus> {
  return fastlyFetch<BotManagementStatus>(`${BOT_MANAGEMENT_BASE}/services/${serviceId}/configuration`);
}

// Bot detection categories reported by the stats API, keyed by the
// bot_edge_requests_{category}_count metric name fragment.
const BOT_TYPE_METRICS: Record<string, string> = {
  ai_crawler: "AI Crawlers",
  ai_fetcher: "AI Fetchers",
  search_engine_crawler: "Search Engine Crawlers",
  content_fetcher: "Content Fetchers",
  headless: "Headless Browsers",
  monitoring: "Monitoring & Site Tools",
  online_marketing: "Online Marketing",
  page_preview: "Page Previews",
  platform_integrations: "Platform Integrations",
  research: "Research",
  search_engine_optimization: "SEO",
  security_tools: "Security Tools",
  accessibility: "Accessibility",
  verified: "Verified Bots",
};

export async function getBotStats(serviceId: string, hours = 24): Promise<BotStats> {
  const now = new Date();
  const from = new Date(now.getTime() - hours * 60 * 60 * 1000);

  const response = await fastlyFetch<{ data?: Array<Record<string, number>> }>(
    `/stats/service/${serviceId}?from=${from.toISOString()}&to=${now.toISOString()}&by=hour`,
  );

  const stats: BotStats = {
    analyzed: 0,
    detected: 0,
    challenges_issued: 0,
    challenges_succeeded: 0,
    challenges_failed: 0,
    byType: {},
  };

  for (const hour of response.data || []) {
    stats.analyzed += hour.bot_edge_requests_analyzed_count || 0;
    stats.detected += hour.bot_edge_requests_detected_count || 0;
    stats.challenges_issued += hour.bot_challenges_issued || 0;
    stats.challenges_succeeded += hour.bot_challenges_succeeded || 0;
    stats.challenges_failed += hour.bot_challenges_failed || 0;

    for (const [metric, label] of Object.entries(BOT_TYPE_METRICS)) {
      const count = hour[`bot_edge_requests_${metric}_count`] || 0;
      if (count > 0) {
        stats.byType[label] = (stats.byType[label] || 0) + count;
      }
    }
  }

  return stats;
}

// DDoS Protection API functions
// Product enablement mirrors Bot Management; events and rules live under
// /ddos-protection/v1 and drive real-time attack mitigation.

const DDOS_PRODUCT_BASE = "/enabled-products/v1/ddos_protection";
const DDOS_BASE = "/ddos-protection/v1";

export async function getDdosProtectionEnabledServices(): Promise<string[]> {
  const response = await fastlyFetch<BotManagementEnabledServicesResponse>(`${DDOS_PRODUCT_BASE}/services`);
  return (response.services || []).map((service) => (typeof service === "string" ? service : service.id));
}

export async function enableDdosProtection(serviceId: string): Promise<void> {
  await fastlyFetch(`${DDOS_PRODUCT_BASE}/services/${serviceId}`, { method: "PUT" });
}

export async function disableDdosProtection(serviceId: string): Promise<void> {
  await fastlyFetch(`${DDOS_PRODUCT_BASE}/services/${serviceId}`, { method: "DELETE" });
}

export async function getDdosProtectionMode(serviceId: string): Promise<string | undefined> {
  const response = await fastlyFetch<{ configuration?: DdosProtectionConfiguration }>(
    `${DDOS_PRODUCT_BASE}/services/${serviceId}/configuration`,
  );
  return response.configuration?.mode;
}

export async function setDdosProtectionMode(serviceId: string, mode: "log" | "block"): Promise<void> {
  await fastlyFetch(`${DDOS_PRODUCT_BASE}/services/${serviceId}/configuration`, {
    method: "PATCH",
    body: JSON.stringify({ mode }),
  });
}

export async function getDdosEvents(
  options: {
    serviceId?: string;
    from?: string;
    cursor?: string;
    limit?: number;
  } = {},
): Promise<DdosEventsResponse> {
  const params = new URLSearchParams();
  if (options.serviceId) params.set("service_id", options.serviceId);
  if (options.from) params.set("from", options.from);
  if (options.cursor) params.set("cursor", options.cursor);
  params.set("limit", String(options.limit ?? 100));
  return fastlyFetch<DdosEventsResponse>(`${DDOS_BASE}/events?${params.toString()}`);
}

export async function getDdosEventRules(eventId: string, cursor?: string): Promise<DdosRulesResponse> {
  const params = new URLSearchParams();
  params.set("limit", "100");
  if (cursor) params.set("cursor", cursor);
  return fastlyFetch<DdosRulesResponse>(`${DDOS_BASE}/events/${eventId}/rules?${params.toString()}`);
}

export async function updateDdosRuleAction(ruleId: string, action: string): Promise<DdosProtectionRule> {
  return fastlyFetch<DdosProtectionRule>(`${DDOS_BASE}/rules/${ruleId}`, {
    method: "PATCH",
    body: JSON.stringify({ action }),
  });
}

// Single-service product enablement checks; the status endpoint returns 404
// when the product isn't enabled on the service.

async function isProductEnabled(productBase: string, serviceId: string): Promise<boolean> {
  try {
    await fastlyFetch(`${productBase}/services/${serviceId}`);
    return true;
  } catch (error) {
    // Newer products return 404 when not enabled; older ones return
    // 400 with "no product on service".
    if (isArcNotFoundError(error)) {
      return false;
    }
    if (error instanceof FastlyApiError && error.status === 400 && error.message.includes("no product on service")) {
      return false;
    }
    throw error;
  }
}

export async function isBotManagementEnabled(serviceId: string): Promise<boolean> {
  return isProductEnabled(BOT_MANAGEMENT_BASE, serviceId);
}

export async function isDdosProtectionEnabled(serviceId: string): Promise<boolean> {
  return isProductEnabled(DDOS_PRODUCT_BASE, serviceId);
}

export async function getDdosStats(serviceId: string, hours = 24): Promise<DdosStats> {
  const now = new Date();
  const from = new Date(now.getTime() - hours * 60 * 60 * 1000);

  const response = await fastlyFetch<{ data?: Array<Record<string, number>> }>(
    `/stats/service/${serviceId}?from=${from.toISOString()}&to=${now.toISOString()}&by=hour`,
  );

  const stats: DdosStats = { requests: 0, allowed: 0, detected: 0, mitigated: 0 };
  for (const hour of response.data || []) {
    stats.requests += hour.requests || hour.compute_requests || 0;
    stats.allowed += hour.ddos_protection_requests_allow_count || 0;
    stats.detected += hour.ddos_protection_requests_detect_count || 0;
    stats.mitigated += hour.ddos_protection_requests_mitigate_count || 0;
  }
  return stats;
}

// Purge API functions

// Purges a single URL. The URL is host + path with no scheme; soft purge marks
// content stale instead of removing it. The input is parsed and rebuilt so
// dot-segments can't traverse out of /purge/ into other API routes.
export async function purgeUrl(url: string, soft: boolean): Promise<{ id?: string; status?: string }> {
  const withoutScheme = url.trim().replace(/^https?:\/\//, "");
  let parsed: URL;
  try {
    parsed = new URL(`https://${withoutScheme}`);
  } catch {
    throw new Error(`"${url}" is not a valid URL`);
  }
  const target = `${parsed.host}${parsed.pathname}${parsed.search}`;
  return fastlyFetch<{ id?: string; status?: string }>(`/purge/${target}`, {
    method: "POST",
    headers: soft ? { "fastly-soft-purge": "1" } : {},
  });
}

export async function purgeSurrogateKeys(
  serviceId: string,
  keys: string[],
  soft: boolean,
): Promise<Record<string, string>> {
  return fastlyFetch<Record<string, string>>(`/service/${serviceId}/purge`, {
    method: "POST",
    headers: soft ? { "fastly-soft-purge": "1" } : {},
    body: JSON.stringify({ surrogate_keys: keys }),
  });
}

// Service version API functions

export async function getServiceVersions(serviceId: string): Promise<ServiceVersion[]> {
  return fastlyFetch<ServiceVersion[]>(`/service/${serviceId}/version`);
}

export async function activateServiceVersion(serviceId: string, version: number): Promise<void> {
  await fastlyFetch(`/service/${serviceId}/version/${version}/activate`, { method: "PUT" });
}

export async function cloneServiceVersion(serviceId: string, version: number): Promise<ServiceVersion> {
  return fastlyFetch<ServiceVersion>(`/service/${serviceId}/version/${version}/clone`, { method: "PUT" });
}

export async function getServiceVersionDiff(serviceId: string, from: number, to: number): Promise<string> {
  const response = await fastlyFetch<{ diff?: string }>(`/service/${serviceId}/diff/from/${from}/to/${to}?format=text`);
  return response.diff || "";
}

// Generic product enablement (enabled-products/v1 family)

export async function isServiceProductEnabled(productId: string, serviceId: string): Promise<boolean> {
  return isProductEnabled(`/enabled-products/v1/${productId}`, serviceId);
}

export async function enableServiceProduct(productId: string, serviceId: string): Promise<void> {
  await fastlyFetch(`/enabled-products/v1/${productId}/services/${serviceId}`, { method: "PUT" });
}

export async function disableServiceProduct(productId: string, serviceId: string): Promise<void> {
  await fastlyFetch(`/enabled-products/v1/${productId}/services/${serviceId}`, { method: "DELETE" });
}

// TLS API functions (JSON:API pagination)

async function fetchAllTlsPages<T>(path: string): Promise<T[]> {
  const items: T[] = [];
  let page = 1;
  let totalPages = 1;
  do {
    const response = await fastlyFetch<TlsListResponse<T>>(`${path}?page[size]=100&page[number]=${page}`);
    items.push(...(response.data || []));
    totalPages = response.meta?.total_pages ?? 1;
    page += 1;
  } while (page <= totalPages && page <= 10);
  return items;
}

export async function getTlsCertificates(): Promise<TlsCertificate[]> {
  return fetchAllTlsPages<TlsCertificate>("/tls/certificates");
}

export async function getTlsSubscriptions(): Promise<TlsSubscription[]> {
  return fetchAllTlsPages<TlsSubscription>("/tls/subscriptions");
}

// Alerts API functions

export async function getAlertDefinitions(cursor?: string): Promise<AlertListResponse<AlertDefinition>> {
  const params = new URLSearchParams();
  params.set("limit", "100");
  if (cursor) params.set("cursor", cursor);
  return fastlyFetch<AlertListResponse<AlertDefinition>>(`/alerts/definitions?${params.toString()}`);
}

export async function getAlertHistory(
  options: {
    definitionId?: string;
    status?: string;
    cursor?: string;
  } = {},
): Promise<AlertListResponse<AlertHistoryEntry>> {
  const params = new URLSearchParams();
  params.set("limit", "100");
  params.set("sort", "-start");
  if (options.definitionId) params.set("definition_id", options.definitionId);
  if (options.status) params.set("status", options.status);
  if (options.cursor) params.set("cursor", options.cursor);
  return fastlyFetch<AlertListResponse<AlertHistoryEntry>>(`/alerts/history?${params.toString()}`);
}

// Real-time stats (rt.fastly.com). "h" returns up to 120 seconds of buffered
// history; a numeric timestamp long-polls for data newer than that point.
export async function getRealtimeStats(serviceId: string, timestamp: number | "h"): Promise<RealtimeResponse> {
  const preferences = getPreferenceValues<Preferences>();
  const response = await fetch(`https://rt.fastly.com/v1/channel/${serviceId}/ts/${timestamp}`, {
    headers: { "Fastly-Key": preferences.apiToken, Accept: "application/json" },
  });
  if (!response.ok) {
    throw new Error(`Real-time stats error: ${response.statusText} (${response.status})`);
  }
  return (await response.json()) as RealtimeResponse;
}
