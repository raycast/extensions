/**
 * Authenticated reverse lookup via Microsoft Graph.
 *
 * `findTenantInformationByTenantId` returns basic, public tenant information for
 * ANY tenant GUID: the organization display name and the tenant's default
 * (`*.onmicrosoft.com`) domain. Requires a token with the delegated
 * `CrossTenantInformation.ReadBasic.All` scope (work/school accounts only).
 *
 * Docs: https://learn.microsoft.com/graph/api/tenantrelationship-findtenantinformationbytenantid
 */

const GRAPH_TIMEOUT_MS = 8000;

export interface TenantInfo {
  tenantId: string;
  displayName?: string;
  defaultDomainName?: string;
  federationBrandName?: string;
}

function isTimeoutError(error: unknown): boolean {
  return error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError");
}

/** Look up a tenant's org name + default domain from its GUID. Throws on failure. */
export async function findTenantById(token: string, tenantId: string): Promise<TenantInfo> {
  const url = `https://graph.microsoft.com/v1.0/tenantRelationships/findTenantInformationByTenantId(tenantId='${encodeURIComponent(
    tenantId,
  )}')`;

  let res: Response;
  try {
    res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
      signal: AbortSignal.timeout(GRAPH_TIMEOUT_MS),
    });
  } catch (error) {
    if (isTimeoutError(error)) {
      throw new Error("Request timed out. Check your connection and try again.");
    }
    throw error;
  }

  if (res.status === 404) {
    throw new Error("No Microsoft tenant exists with that ID.");
  }
  if (!res.ok) {
    let message = `Graph request failed (${res.status})`;
    try {
      const body = (await res.json()) as { error?: { message?: string } };
      if (body.error?.message) message = body.error.message;
    } catch {
      // Non-JSON error body — keep the status-based message.
    }
    if (res.status === 401 || res.status === 403) {
      message += " — check that admin consent was granted for CrossTenantInformation.ReadBasic.All.";
    }
    throw new Error(message);
  }

  return (await res.json()) as TenantInfo;
}
