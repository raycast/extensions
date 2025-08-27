/* eslint-disable @typescript-eslint/no-explicit-any */
import { getPreferenceValues, showToast, Toast } from "@raycast/api";
import { GandiDomain, DomainAvailability, DNSRecord, DNSZone, WebsiteMetadata } from "./types";


const createRequest = async <T>(url: string, options: RequestInit = {}): Promise<T> => {
  const preferences = getPreferenceValues<Preferences>();

  if (!preferences?.apiToken) {
    throw new Error("API token is required");
  }

  try {
    const response = await fetch(url, {
      method: "GET",
      ...options,
      headers: {
        Authorization: `Bearer ${preferences.apiToken}`,
        "Content-Type": "application/json",
        ...options.headers,
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    return (await response.json()) as T;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    await showToast({
      style: Toast.Style.Failure,
      title: "API Error",
      message,
    });
    throw error;
  }
};

export const validateToken = (): Promise<any> => createRequest("https://id.gandi.net/tokeninfo");

export const getDomains = (): Promise<GandiDomain[]> =>
  createRequest<GandiDomain[]>("https://api.gandi.net/v5/domain/domains");

export const getDomain = (domain: string): Promise<GandiDomain> =>
  createRequest<GandiDomain>("https://api.gandi.net/v5/domain/domains/" + domain);

export const checkAvailability = async (domain: string): Promise<DomainAvailability> => {
  const params = new URLSearchParams({ name: domain });
  const raw = await createRequest<any>("https://api.gandi.net/v5/domain/check?" + params.toString());

  // The API can return either an object or an array of results.
  const pickEntry = (r: any): any => {
    if (!Array.isArray(r)) return r;
    const lower = domain.toLowerCase();
    const lastDot = lower.lastIndexOf(".");
    const sld = lastDot > 0 ? lower.slice(0, lastDot) : lower;
    const tld = lastDot > 0 ? lower.slice(lastDot + 1) : "";
    // 1) Exact fqdn match
    const byFqdn = r.find((e: any) => {
      const candidates = [e?.fqdn, e?.fqdn_unicode, e?.domain];
      return candidates.some((c) => typeof c === "string" && c.toLowerCase() === lower);
    });
    if (byFqdn) return byFqdn;
    // 2) name + tld match when fields are separated
    const byNameTld = r.find((e: any) => {
      const name = typeof e?.name === "string" ? e.name.toLowerCase() : undefined;
      const etld = typeof e?.tld === "string" ? e.tld.toLowerCase() : undefined;
      return name === sld && etld === tld;
    });
    if (byNameTld) return byNameTld;
    // 3) Any entry sharing the same tld (for pricing fallback)
    const byTld = r.find((e: any) => typeof e?.tld === "string" && e.tld.toLowerCase() === tld);
    return byTld ?? r[0];
  };

  const entry = pickEntry(raw) ?? {};

  // Robust availability mapping per docs (2023-05-11 added notes on status)
  const asBool = (v: any) => (typeof v === "boolean" ? v : undefined);
  const asStr = (v: any) => (typeof v === "string" ? v.toLowerCase() : undefined);

  const status = asStr(entry.status) || asStr(entry.availability) || asStr(raw?.status);
  const availableFromStatus =
    status === "available" ||
    status === "maybe" ||
    status === "free" ||
    status === "not_registered" ||
    (status?.startsWith("available_") ?? false); // e.g., available_backorder, available_premium

  let available: boolean | undefined = undefined;
  available = available ?? asBool(entry.available);
  if (available === undefined && typeof entry.available === "string") {
    available = /^(available|yes|true)$/i.test(String(entry.available));
  }
  available = available ?? asBool(entry.is_available);
  // Some payloads expose "exists" (true if registered). If present, invert it.
  if (available === undefined && typeof entry.exists === "boolean") {
    available = !entry.exists;
  }
  if (available === undefined) {
    // Guard against "unavailable" which contains the word "available"
    if (status === "unavailable" || status === "taken" || status === "invalid" || status === "reserved") {
      available = false;
    } else if (availableFromStatus) {
      available = true;
    }
  }

  // Merge potential pricing info if the selected entry doesn't have it. If raw is an array,
  // try to find a sibling with the same TLD that carries the products list.
  let products = entry.products;
  let taxes = entry.taxes;
  let currency = entry.currency;
  if (!products || !Array.isArray(products) || products.length === 0) {
    if (Array.isArray(raw)) {
      const lower2 = domain.toLowerCase();
      const tld2 = lower2.includes(".") ? lower2.slice(lower2.lastIndexOf(".") + 1) : undefined;
      const sibling = raw.find((e: any) => typeof e?.tld === "string" && e.tld.toLowerCase() === tld2);
      products = sibling?.products ?? products;
      taxes = sibling?.taxes ?? taxes;
      currency = sibling?.currency ?? currency;
    } else {
      products = raw?.products ?? products;
      taxes = raw?.taxes ?? taxes;
      currency = raw?.currency ?? currency;
    }
  }

  // If availability still unknown, infer it from product processes and statuses
  if (available === undefined && Array.isArray(products)) {
    const prods = products as any[];
    const norm = (s: any) => String(s || "").toLowerCase();
    const hasCreateAvailable = prods.some(
      (p) => norm(p?.process ?? p?.action) === "create" && /available/i.test(norm(p?.status)),
    );
    const hasRenewAvailable = prods.some(
      (p) => norm(p?.process ?? p?.action) === "renew" && /available/i.test(norm(p?.status)),
    );
    if (hasCreateAvailable) available = true;
    else if (hasRenewAvailable) available = false;
    else {
      // Fallback to presence of process
      const processes = new Set(prods.map((p) => norm(p?.process ?? p?.action)));
      if (processes.has("create")) available = true;
    }
  }

  // Final fallback: rely on status-derived inference if still undefined
  available ??= availableFromStatus ?? false;

  return { ...entry, products, taxes, currency, available: Boolean(available) } as DomainAvailability;
};

export const setAutoRenew = (domain: string, enabled: boolean): Promise<void> =>
  createRequest("https://api.gandi.net/v5/domain/domains/" + domain + "/autorenew", {
    method: "PATCH",
    body: JSON.stringify({ autorenew: enabled }),
  });

export const getDNSRecords = (domain: string): Promise<DNSRecord[]> =>
  createRequest<DNSRecord[]>("https://api.gandi.net/v5/livedns/domains/" + domain + "/records");

export const createDNSRecord = (domain: string, record: Partial<DNSRecord>): Promise<DNSRecord> =>
  createRequest<DNSRecord>("https://api.gandi.net/v5/livedns/domains/" + domain + "/records", {
    method: "POST",
    body: JSON.stringify(record),
  });

export const updateDNSRecord = (
  domain: string,
  name: string,
  type: string,
  record: Partial<DNSRecord>,
): Promise<DNSRecord> =>
  createRequest<DNSRecord>("https://api.gandi.net/v5/livedns/domains/" + domain + "/records/" + name + "/" + type, {
    method: "PUT",
    body: JSON.stringify(record),
  });

export const deleteDNSRecord = (domain: string, name: string, type: string): Promise<void> =>
  createRequest("https://api.gandi.net/v5/livedns/domains/" + domain + "/records/" + name + "/" + type, {
    method: "DELETE",
  });

export const getDNSZones = (): Promise<DNSZone[]> => createRequest<DNSZone[]>("https://api.gandi.net/v5/livedns/zones");

export const renewDomain = (domain: string, duration = 1): Promise<any> =>
  createRequest("https://api.gandi.net/v5/domain/domains/" + domain + "/renew", {
    method: "POST",
    body: JSON.stringify({ duration }),
  });

export const resetAuthCode = (domain: string): Promise<void> =>
  createRequest("https://api.gandi.net/v5/domain/domains/" + domain + "/authinfo", {
    method: "PUT",
  });

export const changeOwner = (domain: string, ownerData: any): Promise<any> =>
  createRequest("https://api.gandi.net/v5/domain/changeowner/" + domain, {
    method: "POST",
    body: JSON.stringify(ownerData),
  });

export const getOwnerChangeStatus = (domain: string): Promise<any> =>
  createRequest("https://api.gandi.net/v5/domain/changeowner/" + domain);

export const checkTrademarkClaims = (domain: string): Promise<any> =>
  createRequest("https://api.gandi.net/v5/domain/domains/" + domain + "/claims");

// Domain Contacts Management
export const getDomainContacts = (domain: string): Promise<any> =>
  createRequest("https://api.gandi.net/v5/domain/domains/" + domain + "/contacts");

export const updateDomainContacts = (domain: string, contacts: any): Promise<any> =>
  createRequest("https://api.gandi.net/v5/domain/domains/" + domain + "/contacts", {
    method: "PATCH",
    body: JSON.stringify(contacts),
  });

// Nameserver Management
export const getNameservers = (domain: string): Promise<any> =>
  createRequest("https://api.gandi.net/v5/domain/domains/" + domain + "/nameservers");

export const updateNameservers = (domain: string, nameservers: string[]): Promise<any> =>
  createRequest("https://api.gandi.net/v5/domain/domains/" + domain + "/nameservers", {
    method: "PUT",
    body: JSON.stringify({ nameservers }),
  });

// Domain Lock Status
export const updateTransferLock = (domain: string, locked: boolean): Promise<any> =>
  createRequest("https://api.gandi.net/v5/domain/domains/" + domain + "/status", {
    method: "PATCH",
    body: JSON.stringify({ status: locked ? "lock" : "unlock" }),
  });

// Domain Renewal Information
export const getRenewalInfo = (domain: string): Promise<any> =>
  createRequest("https://api.gandi.net/v5/domain/domains/" + domain + "/renew");

// Domain Tags Management
export const getDomainTags = (domain: string): Promise<any> =>
  createRequest("https://api.gandi.net/v5/domain/domains/" + domain + "/tags");

export const updateDomainTags = (domain: string, tags: string[]): Promise<any> =>
  createRequest("https://api.gandi.net/v5/domain/domains/" + domain + "/tags", {
    method: "PUT",
    body: JSON.stringify(tags),
  });

// Transfer Operations
export const transferDomainIn = (domain: string, authcode: string, contacts: any): Promise<any> =>
  createRequest("https://api.gandi.net/v5/domain/transferin", {
    method: "POST",
    body: JSON.stringify({ domain, authcode, ...contacts }),
  });

export const getTransferStatus = (domain: string): Promise<any> =>
  createRequest("https://api.gandi.net/v5/domain/transferin/" + domain);

// TLD Information
export const getTLDs = (): Promise<any> => createRequest("https://api.gandi.net/v5/domain/tlds");

export const getTLDInfo = (tld: string): Promise<any> => createRequest("https://api.gandi.net/v5/domain/tlds/" + tld);

// Lightweight Website Metadata fetcher (best-effort)
export const fetchWebsiteMetadata = async (url: string): Promise<WebsiteMetadata | undefined> => {
  // Ensure protocol
  let target = url;
  if (!/^https?:\/\//i.test(target)) {
    target = "https://" + target;
  }
  try {
    const res = await fetch(target, { method: "GET" });
    if (!res.ok) return { finalUrl: target };
    const html = await res.text();

    const pick = (re: RegExp) => re.exec(html)?.[1]?.trim();

    const title =
      pick(/<title>([^<]+)<\/title>/i) || pick(/meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)/i);
    const description =
      pick(/meta[^>]*name=["']description["'][^>]*content=["']([^"']+)/i) ||
      pick(/meta[^>]*property=["']og:description["'][^>]*content=["']([^"']+)/i);
    const image = pick(/meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)/i);
    const favicon = pick(/link[^>]*rel=["'](?:icon|shortcut icon)["'][^>]*href=["']([^"']+)/i);

    // Resolve relative URLs
    const base = new URL(res.url || target);
    const resolve = (v?: string) => (v ? new URL(v, base).toString() : undefined);

    return {
      finalUrl: res.url || target,
      title,
      description,
      image: resolve(image),
      favicon: resolve(favicon),
    };
  } catch {
    return undefined;
  }
};
