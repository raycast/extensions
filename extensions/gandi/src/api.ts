import { getPreferenceValues } from "@raycast/api";
import { GandiDomain, DomainAvailability, DNSRecord, WebsiteMetadata, GandiError, GandiMessage } from "./types";
import { showFailureToast } from "@raycast/utils";

const createRequest = async <T>(endpoint: string, options: RequestInit = {}): Promise<T> => {
  const preferences = getPreferenceValues<Preferences>();

  try {
    const url = new URL(
      endpoint,
      preferences.sandboxApiToken ? "https://api.sandbox.gandi.net/" : "https://api.gandi.net/",
    );
    const token = preferences.sandboxApiToken || preferences.apiToken;
    const response = await fetch(url, {
      method: "GET",
      ...options,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(options.body ? { "Content-Type": "application/json" } : {}),
      },
    });

    if (response.status === 204) return undefined as T;
    const result = await response.json();
    if (!response.ok) {
      const err = result as GandiError;
      throw new Error("message" in err ? err.message : err.errors?.[0]?.description || response.statusText);
    }

    return result as T;
  } catch (error) {
    await showFailureToast(error || "Unknown error", { title: "API Error" });
    throw error;
  }
};

export const getDomains = (): Promise<GandiDomain[]> => createRequest<GandiDomain[]>("v5/domain/domains");

export const checkAvailability = async (domain: string): Promise<DomainAvailability> => {
  const params = new URLSearchParams({ name: domain });
  const entry = await createRequest<Omit<DomainAvailability, "available">>("v5/domain/check?" + params.toString());
  // If process==="create", the domain is in an available state. The state then informs us if it's actually available. (ref: https://api.gandi.net/docs/domains/#get-v5-domain-check)
  const available =
    entry.products?.some((product) => product.process === "create" && product.status.startsWith("available")) ?? false;
  return { ...entry, available };
};

export const setAutoRenew = (domain: string, enabled: boolean): Promise<void> =>
  createRequest("v5/domain/domains/" + domain + "/autorenew", {
    method: "PATCH",
    body: JSON.stringify({ autorenew: enabled }),
  });

export const getDNSRecords = (domain: string): Promise<DNSRecord[]> =>
  createRequest<DNSRecord[]>("v5/livedns/domains/" + domain + "/records");

export const createDNSRecord = (domain: string, record: Partial<DNSRecord>): Promise<DNSRecord> =>
  createRequest<DNSRecord>("v5/livedns/domains/" + domain + "/records", {
    method: "POST",
    body: JSON.stringify(record),
  });

export const updateDNSRecord = (
  domain: string,
  name: string,
  type: string,
  record: Partial<DNSRecord>,
): Promise<DNSRecord> =>
  createRequest<DNSRecord>("v5/livedns/domains/" + domain + "/records/" + name + "/" + type, {
    method: "PUT",
    body: JSON.stringify(record),
  });

export const deleteDNSRecord = (domain: string, name: string, type: string): Promise<void> =>
  createRequest("v5/livedns/domains/" + domain + "/records/" + name + "/" + type, {
    method: "DELETE",
  });
export const updateTransferLock = (domain: string, locked: boolean): Promise<GandiMessage> =>
  createRequest("v5/domain/domains/" + domain + "/status", {
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
