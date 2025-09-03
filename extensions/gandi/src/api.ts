/* eslint-disable @typescript-eslint/no-explicit-any */
import { getPreferenceValues, showToast, Toast } from "@raycast/api";
import { GandiDomain, DomainAvailability, DNSRecord, WebsiteMetadata } from "./types";

const createRequest = async <T>(url: string, options: RequestInit = {}): Promise<T> => {
  const preferences = getPreferenceValues<Preferences>();

  try {
    const additionalHeaders: Record<string, string> = {};
    const rawHeaders = (options.headers ?? {}) as any;
    if (Array.isArray(rawHeaders)) {
      for (const pair of rawHeaders) {
        const [k, v] = pair as [string, string];
        if (typeof k === "string" && k.toLowerCase() !== "authorization") additionalHeaders[k] = String(v);
      }
    } else if (rawHeaders && typeof rawHeaders === "object") {
      for (const k of Object.keys(rawHeaders)) {
        if (k.toLowerCase() !== "authorization") additionalHeaders[k] = String(rawHeaders[k]);
      }
    }

    const response = await fetch(url, {
      method: "GET",
      ...options,
      headers: {
        Authorization: `Bearer ${preferences.apiToken}`,
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        ...additionalHeaders,
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

export const getDomains = (): Promise<GandiDomain[]> =>
  createRequest<GandiDomain[]>("https://api.gandi.net/v5/domain/domains");

export const checkAvailability = async (domain: string): Promise<DomainAvailability> => {
  const params = new URLSearchParams({ name: domain });
  const raw = await createRequest<any>("https://api.gandi.net/v5/domain/check?" + params.toString());

  const pickEntry = (r: any): any => {
    if (!Array.isArray(r)) return r;
    const lower = domain.toLowerCase();
    const lastDot = lower.lastIndexOf(".");
    const sld = lastDot > 0 ? lower.slice(0, lastDot) : lower;
    const tld = lastDot > 0 ? lower.slice(lastDot + 1) : "";
    const byFqdn = r.find((e: any) => {
      const candidates = [e?.fqdn, e?.fqdn_unicode, e?.domain];
      return candidates.some((c) => typeof c === "string" && c.toLowerCase() === lower);
    });
    if (byFqdn) return byFqdn;
    const byNameTld = r.find((e: any) => {
      const name = typeof e?.name === "string" ? e.name.toLowerCase() : undefined;
      const etld = typeof e?.tld === "string" ? e.tld.toLowerCase() : undefined;
      return name === sld && etld === tld;
    });
    if (byNameTld) return byNameTld;
    const byTld = r.find((e: any) => typeof e?.tld === "string" && e.tld.toLowerCase() === tld);
    return byTld ?? r[0];
  };

  const entry = pickEntry(raw) ?? {};
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
  if (available === undefined && typeof entry.exists === "boolean") {
    available = !entry.exists;
  }
  if (available === undefined) {
    if (status === "unavailable" || status === "taken" || status === "invalid" || status === "reserved") {
      available = false;
    } else if (availableFromStatus) {
      available = true;
    }
  }

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
      const processes = new Set(prods.map((p) => norm(p?.process ?? p?.action)));
      if (processes.has("create")) available = true;
    }
  }

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
export const updateTransferLock = (domain: string, locked: boolean): Promise<any> =>
  createRequest("https://api.gandi.net/v5/domain/domains/" + domain + "/status", {
    method: "PATCH",
    body: JSON.stringify({ status: locked ? "lock" : "unlock" }),
  });

export const fetchWebsiteMetadata = async (url: string): Promise<WebsiteMetadata | undefined> => {
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
