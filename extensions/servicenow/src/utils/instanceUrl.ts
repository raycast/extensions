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

  return url.replace(/\/+$/, "");
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
