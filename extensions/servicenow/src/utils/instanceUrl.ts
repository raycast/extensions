import { Instance } from "../types";

export const DEFAULT_DOMAIN = "service-now.com";
export const KNOWN_SN_DOMAINS = ["service-now.com", "servicenowservices.com"];

export function getInstanceBaseUrl(instance: Pick<Instance, "name">): string {
  const raw = (instance.name ?? "").trim();
  if (!raw) return "";

  let url: string;
  if (/^https?:\/\//i.test(raw)) {
    url = raw;
  } else if (raw.includes(".")) {
    url = `https://${raw}`;
  } else {
    url = `https://${raw}.${DEFAULT_DOMAIN}`;
  }

  try {
    return new URL(url).origin;
  } catch {
    return url.replace(/\/+$/, "");
  }
}

export function normalizeInstanceName(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";

  try {
    const hasProtocol = /^https?:\/\//i.test(trimmed);
    const parsed = new URL(hasProtocol ? trimmed : `https://${trimmed}`);
    // Preserve the full origin for non-default protocols/ports (http://, custom port).
    if (parsed.protocol !== "https:" || parsed.port !== "") {
      return parsed.origin;
    }
    // For *.service-now.com cloud instances, keep just the subdomain — getInstanceBaseUrl
    // rebuilds the full URL via DEFAULT_DOMAIN. Skip if the subdomain has its own dots,
    // which would break that round-trip.
    const host = parsed.host;
    const suffix = `.${DEFAULT_DOMAIN}`;
    if (host.endsWith(suffix)) {
      const sub = host.slice(0, -suffix.length);
      if (sub && !sub.includes(".")) return sub;
    }
    return host;
  } catch {
    return trimmed.replace(/\/+$/, "");
  }
}

export function isServiceNowUrl(url: string, instances: Instance[] = []): boolean {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }

  const hostname = parsed.hostname.toLowerCase();

  if (KNOWN_SN_DOMAINS.some((d) => hostname === d || hostname.endsWith(`.${d}`))) {
    return true;
  }

  return instances.some((instance) => {
    try {
      const instanceHost = new URL(getInstanceBaseUrl(instance)).hostname.toLowerCase();
      return instanceHost === hostname;
    } catch {
      return false;
    }
  });
}
