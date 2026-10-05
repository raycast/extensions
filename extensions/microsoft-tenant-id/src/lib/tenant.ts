/**
 * Core logic for resolving Microsoft Entra (Azure AD) tenant IDs from domains.
 *
 * Everything here relies only on public, unauthenticated metadata endpoints:
 * - OpenID Connect discovery (`/.well-known/openid-configuration`) → tenant ID + region.
 * - `getuserrealm.srf` → organization brand name + Managed/Federated auth type.
 */

export const GUID_REGEX = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
export const TENANT_ID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const DOMAIN_REGEX = /^(?=.{1,253}$)([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/;

const REQUEST_TIMEOUT_MS = 6000;

export type CloudKey = "commercial" | "usGov" | "china";

export interface CloudConfig {
  key: CloudKey;
  label: string;
  loginHost: string;
  portalUrl: string;
  /** Entra admin center (commercial only); other clouds fall back to the Azure portal. */
  entraUrl?: string;
  adminUrl: string;
}

export const CLOUDS: Record<CloudKey, CloudConfig> = {
  commercial: {
    key: "commercial",
    label: "Commercial",
    loginHost: "login.microsoftonline.com",
    portalUrl: "https://portal.azure.com",
    entraUrl: "https://entra.microsoft.com",
    adminUrl: "https://admin.microsoft.com",
  },
  usGov: {
    key: "usGov",
    label: "US Gov (GCC High / DoD)",
    loginHost: "login.microsoftonline.us",
    portalUrl: "https://portal.azure.us",
    adminUrl: "https://portal.office365.us",
  },
  china: {
    key: "china",
    label: "China (21Vianet)",
    loginHost: "login.partner.microsoftonline.cn",
    portalUrl: "https://portal.azure.cn",
    adminUrl: "https://portal.partner.microsoftonline.cn",
  },
};

const CLOUD_ORDER: CloudKey[] = ["commercial", "usGov", "china"];

/** Map a cloud's display label back to its key (used when restoring saved history). */
export function cloudKeyFromLabel(label?: string): CloudKey | undefined {
  if (!label) return undefined;
  return CLOUD_ORDER.find((key) => CLOUDS[key].label === label);
}

export type NamespaceType = "Managed" | "Federated";

export interface TenantResult {
  /** The original token the user typed (before normalization). */
  input: string;
  /** The normalized domain used for the lookup. */
  domain: string;
  tenantId?: string;
  cloud?: CloudKey;
  cloudLabel?: string;
  regionScope?: string;
  /** Organization display name (from getuserrealm `FederationBrandName`). */
  brandName?: string;
  namespaceType?: NamespaceType;
  /** Federation (ADFS) sign-in URL, present only for federated tenants. */
  federationUrl?: string;
  /** True for the shared consumer tenants that back personal Microsoft accounts. */
  isConsumer?: boolean;
  /** Plain-English explanation, shown for consumer tenants. */
  note?: string;
  /** Example email domains that map to a consumer tenant (for recognition). */
  relatedDomains?: string[];
  error?: string;
}

export interface ParsedToken {
  input: string;
  domain: string;
  valid: boolean;
}

/** Turn free-form input (URL, email, or bare domain) into a lookup-ready domain. */
export function normalizeDomain(input: string): string {
  let value = input.trim().toLowerCase();
  if (!value) return "";
  value = value.replace(/^[a-z][a-z0-9+.-]*:\/\//, "");
  if (value.includes("@")) value = value.slice(value.lastIndexOf("@") + 1);
  value = value.replace(/^\/+/, "").split(/[/?#]/)[0].split(":")[0];
  value = value.replace(/^www\./, "").replace(/\.$/, "");
  return value;
}

export function isValidDomain(domain: string): boolean {
  return DOMAIN_REGEX.test(domain);
}

/** True when the trimmed value is exactly a tenant GUID (used by the reverse lookup). */
export function isTenantId(value: string): boolean {
  return TENANT_ID_REGEX.test(value.trim());
}

/**
 * Well-known shared consumer tenants that back *personal* Microsoft accounts
 * (outlook.com, hotmail.com, live.com, and Microsoft accounts on other domains).
 * They have no organization directory, so Microsoft Graph can't resolve them and
 * you can't sign into them — but they can be recognized locally, without any call.
 *
 * - `9188040d-…` is the canonical "Personal Microsoft accounts" tenant: it's the
 *   tenant ID (`tid`) that appears in tokens from *any* personal account.
 * - The two "Windows Live" GUIDs are consumer namespaces surfaced by domain-based
 *   sign-in discovery (verified live against login.microsoftonline.com).
 */
export interface ConsumerTenant {
  label: string;
  /** Example email domains that resolve to this consumer namespace. */
  domains: string[];
  note: string;
}

const MSA_NOTE =
  "Not an organization — this is the shared tenant behind personal Microsoft accounts. " +
  "It has no directory or admin center, and Microsoft Graph can't resolve an org name, " +
  "so it's recognized locally without sign-in.";

export const KNOWN_CONSUMER_TENANTS: Record<string, ConsumerTenant> = {
  "9188040d-6c67-4c5b-b112-36a304b66dad": {
    label: "Personal Microsoft accounts",
    domains: [],
    note:
      "The tenant ID that appears in tokens from any personal Microsoft account, via the " +
      "/consumers authority. " +
      MSA_NOTE,
  },
  "f8cdef31-a31e-4b4a-93e4-5f571e91255a": {
    label: "Microsoft consumer namespace (Windows Live)",
    domains: ["outlook.com"],
    note:
      "A Microsoft consumer namespace surfaced by domain sign-in discovery. Personal accounts " +
      "on this domain map here; their tokens carry tenant 9188040d-6c67-4c5b-b112-36a304b66dad. " +
      MSA_NOTE,
  },
  "9cd80435-793b-4f48-844b-6b3f37d1c1f3": {
    label: "Microsoft consumer namespace (Windows Live)",
    domains: ["hotmail.com", "live.com", "msn.com"],
    note:
      "A Microsoft consumer namespace surfaced by domain sign-in discovery. Personal accounts " +
      "on these domains map here; their tokens carry tenant 9188040d-6c67-4c5b-b112-36a304b66dad. " +
      MSA_NOTE,
  },
};

/**
 * If the GUID is a well-known consumer tenant, return a labeled result immediately —
 * no Microsoft Graph call or sign-in required. Otherwise returns `undefined`.
 */
export function lookupConsumerTenant(value: string): TenantResult | undefined {
  const id = value.trim().toLowerCase();
  const entry = KNOWN_CONSUMER_TENANTS[id];
  if (!entry) return undefined;
  return {
    input: value.trim(),
    domain: "",
    tenantId: id,
    brandName: entry.label,
    cloud: "commercial",
    cloudLabel: "Commercial",
    isConsumer: true,
    note: entry.note,
    relatedDomains: entry.domains,
  };
}

/**
 * Split free-form text into unique, de-duplicated domain tokens.
 * Separators: whitespace, comma, semicolon, tab and newlines — so pasted
 * comma- or tab-separated lists (and even prose containing domains) all work.
 */
export function parseTokens(text: string): ParsedToken[] {
  const seen = new Set<string>();
  const tokens: ParsedToken[] = [];
  for (const raw of text.split(/[\s,;]+/)) {
    const trimmed = raw.trim();
    if (!trimmed) continue;
    const domain = normalizeDomain(trimmed);
    if (!domain || seen.has(domain)) continue;
    seen.add(domain);
    tokens.push({ input: trimmed, domain, valid: isValidDomain(domain) });
  }
  return tokens;
}

async function fetchWithTimeout(url: string, init?: RequestInit): Promise<Response> {
  return fetch(url, { ...init, signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
}

/** Probe national clouds in parallel; prefer commercial → US Gov → China when several match. */
async function lookupOpenId(
  domain: string,
): Promise<{ cloud: CloudKey; tenantId: string; regionScope?: string } | undefined> {
  const probes = CLOUD_ORDER.map(async (key) => {
    const url = `https://${CLOUDS[key].loginHost}/${encodeURIComponent(domain)}/v2.0/.well-known/openid-configuration`;
    const res = await fetchWithTimeout(url);
    if (!res.ok) return undefined;
    const json = (await res.json()) as {
      issuer?: string;
      token_endpoint?: string;
      tenant_region_scope?: string | null;
    };
    const tenantId = (json.issuer ?? json.token_endpoint ?? "").match(GUID_REGEX)?.[0];
    if (!tenantId) return undefined;
    return { cloud: key, tenantId, regionScope: json.tenant_region_scope ?? undefined };
  });

  const results = await Promise.allSettled(probes);
  for (let i = 0; i < CLOUD_ORDER.length; i++) {
    const settled = results[i];
    if (settled.status === "fulfilled" && settled.value) return settled.value;
  }
  return undefined;
}

/** Enrich a tenant with organization name and Managed/Federated auth type. */
async function getUserRealm(domain: string, cloud: CloudKey): Promise<Partial<TenantResult>> {
  const url = `https://${CLOUDS[cloud].loginHost}/getuserrealm.srf?login=${encodeURIComponent(
    `user@${domain}`,
  )}&json=1`;
  try {
    const res = await fetchWithTimeout(url);
    if (!res.ok) return {};
    const json = (await res.json()) as {
      NameSpaceType?: string;
      FederationBrandName?: string;
      AuthURL?: string;
    };
    const ns = json.NameSpaceType;
    return {
      brandName: json.FederationBrandName || undefined,
      namespaceType: ns === "Managed" || ns === "Federated" ? ns : undefined,
      // Only surface https federation endpoints (AuthURL is remote-sourced from getuserrealm).
      federationUrl: json.AuthURL && /^https:\/\//i.test(json.AuthURL) ? json.AuthURL : undefined,
    };
  } catch {
    return {};
  }
}

/** Resolve a single domain (or free-form input) into a full tenant result. */
export async function lookupTenant(input: string): Promise<TenantResult> {
  const domain = normalizeDomain(input);
  const base: TenantResult = { input, domain };
  if (!isValidDomain(domain)) return { ...base, error: "Not a valid domain" };

  const oid = await lookupOpenId(domain);
  if (!oid) return { ...base, error: "No Microsoft tenant found for this domain" };

  const realm = await getUserRealm(domain, oid.cloud);
  return {
    ...base,
    tenantId: oid.tenantId,
    cloud: oid.cloud,
    cloudLabel: CLOUDS[oid.cloud].label,
    regionScope: oid.regionScope,
    ...realm,
  };
}

// ---------------------------------------------------------------------------
// URL + copy-format helpers
// ---------------------------------------------------------------------------

function cloudOf(result: TenantResult): CloudConfig {
  return result.cloud ? CLOUDS[result.cloud] : CLOUDS.commercial;
}

export function authorityUrl(result: TenantResult): string {
  return `https://${cloudOf(result).loginHost}/${result.tenantId}`;
}

export function openIdConfigUrl(result: TenantResult): string {
  return `https://${cloudOf(result).loginHost}/${result.domain}/v2.0/.well-known/openid-configuration`;
}

export function portalUrl(result: TenantResult): string {
  return `${cloudOf(result).portalUrl}/${result.domain}`;
}

export function entraUrl(result: TenantResult): string {
  const cloud = cloudOf(result);
  return cloud.entraUrl ? `${cloud.entraUrl}/${result.domain}` : `${cloud.portalUrl}/${result.domain}`;
}

export function adminUrl(result: TenantResult): string {
  return cloudOf(result).adminUrl;
}

export function azureCliSnippet(result: TenantResult): string {
  return `az login --tenant ${result.tenantId}`;
}

export function azurePowerShellSnippet(result: TenantResult): string {
  return `Connect-AzAccount -TenantId ${result.tenantId}`;
}

export function graphPowerShellSnippet(result: TenantResult): string {
  return `Connect-MgGraph -TenantId ${result.tenantId}`;
}

export function jsonSnippet(result: TenantResult): string {
  return JSON.stringify(
    {
      domain: result.domain,
      tenantId: result.tenantId,
      cloud: result.cloudLabel,
      region: result.regionScope,
      organization: result.brandName,
      authType: result.namespaceType,
    },
    null,
    2,
  );
}

function csvCell(value: string): string {
  // Neutralize spreadsheet formula injection: a cell beginning with = + - @ tab or CR
  // can be executed as a formula by Excel/Sheets. Values like brandName come from a
  // looked-up domain's owner, so prefix any such cell with a single quote first.
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return /[",\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

export function toCsv(results: TenantResult[]): string {
  const header = "domain,tenantId,cloud,organization,authType";
  const rows = results
    .filter((r) => r.tenantId)
    .map((r) =>
      [r.domain, r.tenantId ?? "", r.cloudLabel ?? "", r.brandName ?? "", r.namespaceType ?? ""].map(csvCell).join(","),
    );
  return [header, ...rows].join("\n");
}

export function tenantIdList(results: TenantResult[]): string {
  return results
    .filter((r) => r.tenantId)
    .map((r) => r.tenantId)
    .join("\n");
}
