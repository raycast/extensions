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
} from "./types";
import { getPreferenceValues } from "@raycast/api";

const FASTLY_API_ENDPOINT = "https://api.fastly.com";

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
      throw new Error(`Fastly API error: ${response.statusText} (${response.status}) - ${errorMessage}`);
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
    throw new Error(`Fastly API error: ${response.statusText} (${response.status}) - ${errorMessage}`);
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
  await fastlyFetch(`/resources/stores/secret/${storeId}/secrets/${encodeURIComponent(name)}`, {
    method: "PUT",
    body: JSON.stringify({ secret }),
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
