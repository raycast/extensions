import axios from "axios";
import { ProviderResult, ProviderSummary } from "../types/ip-providers";

interface IpApiResponse {
  status?: string;
  message?: string;
  country?: string;
  countryCode?: string;
  city?: string;
  isp?: string;
  org?: string;
  as?: string;
}

interface IpwhoisResponse {
  success?: boolean;
  message?: string;
  country?: string;
  country_code?: string;
  city?: string;
  connection?: {
    asn?: number | string;
    org?: string;
    isp?: string;
  };
}

// The free tier returns flat strings; the full format nests country and city under
// `location` and returns `company` and `asn` as objects. Both are accepted.
interface IpapiIsResponse {
  error?: string;
  is_bogon?: boolean;
  country?: string | null;
  city?: string | null;
  company?: string | { name?: string | null } | null;
  asn?: string | { asn?: number | null; org?: string | null } | null;
  location?: { country?: string | null; country_code?: string | null; city?: string | null } | null;
}

interface IpinfoResponse {
  bogon?: boolean;
  error?: string | { title?: string; message?: string };
  country?: string;
  city?: string;
  org?: string;
}

interface RdapResponse {
  errorCode?: number;
  title?: string;
  description?: string[];
  error?: string;
  name?: string;
  country?: string;
  port43?: string;
  autnum?: number | string;
  asn?: number | string;
}

export function cleanString(val: unknown): string | undefined {
  if (typeof val === "string") {
    const trimmed = val.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }
  return undefined;
}

export function cleanCountryCode(val: unknown): string | undefined {
  if (typeof val === "string") {
    const trimmed = val.trim();
    if (trimmed.length === 2 && /^[A-Za-z]{2}$/.test(trimmed)) {
      return trimmed.toUpperCase();
    }
  }
  return undefined;
}

export function deriveCountryName(countryCode?: string): string | undefined {
  if (!countryCode) {
    return undefined;
  }
  try {
    return new Intl.DisplayNames(["en"], { type: "region" }).of(countryCode) || undefined;
  } catch {
    return undefined;
  }
}

let countryCodesByName: Map<string, string> | undefined;

export function countryCodeFromName(name?: string): string | undefined {
  if (!name) {
    return undefined;
  }
  if (!countryCodesByName) {
    countryCodesByName = new Map();
    const names = new Intl.DisplayNames(["en"], { type: "region" });
    for (let a = 65; a <= 90; a++) {
      for (let b = 65; b <= 90; b++) {
        const code = String.fromCharCode(a, b);
        try {
          // Skip retired aliases (UK, SU, FX, YU...) that share a name with the current code
          if (new Intl.Locale(`und-${code}`).region !== code) {
            continue;
          }
          const regionName = names.of(code);
          if (regionName && regionName !== code) {
            countryCodesByName.set(regionName.toLowerCase(), code);
          }
        } catch {
          // not a region code
        }
      }
    }
  }
  return countryCodesByName.get(name.trim().toLowerCase());
}

export function formatAsn(asn: unknown): string | undefined {
  if (asn == null) {
    return undefined;
  }
  const str = String(asn).trim();
  if (str.length === 0) {
    return undefined;
  }
  const match = str.match(/(?:AS)?(\d+)/i);
  if (match) {
    return `AS${match[1]}`;
  }
  return undefined;
}

export function getCountryFlag(countryCode?: string): string {
  if (!countryCode || countryCode.length !== 2) {
    return "";
  }
  const upper = countryCode.toUpperCase();
  if (!/^[A-Z]{2}$/.test(upper)) {
    return "";
  }
  const codePoints = [upper.charCodeAt(0) + 0x1f1a5, upper.charCodeAt(1) + 0x1f1a5];
  return String.fromCodePoint(...codePoints);
}

function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    if (error.code === "ECONNABORTED" || error.message?.toLowerCase().includes("timeout")) {
      return "Request timed out";
    }
    const data = error.response?.data;
    if (data && typeof data === "object") {
      const obj = data as Record<string, unknown>;
      if (typeof obj.message === "string" && obj.message.trim().length > 0) {
        return obj.message.trim();
      }
      if (typeof obj.error === "string" && obj.error.trim().length > 0) {
        return obj.error.trim();
      }
      if (typeof obj.title === "string" && obj.title.trim().length > 0) {
        return obj.title.trim();
      }
    } else if (
      typeof data === "string" &&
      data.trim().length > 0 &&
      !data.includes("<html") &&
      !data.includes("<!DOCTYPE")
    ) {
      return data.trim();
    }
    if (error.response?.status === 429) {
      return "Rate limit exceeded";
    }
    if (error.response?.status === 404) {
      return "Not found";
    }
    return error.message || "Request failed";
  }
  if (error instanceof Error) {
    return error.message;
  }
  return String(error || "Unknown error");
}

export async function lookupIpApi(ip: string): Promise<ProviderResult> {
  const url = `http://ip-api.com/json/${ip}?fields=status,message,country,countryCode,city,isp,org,as`;
  try {
    const response = await axios.get<IpApiResponse>(url, { timeout: 8000 });
    const data = response.data;
    if (data.status !== "success") {
      return {
        provider: "ip-api",
        url,
        ok: false,
        error: cleanString(data.message) || "Lookup failed",
      };
    }
    return {
      provider: "ip-api",
      url,
      ok: true,
      country: cleanString(data.country),
      countryCode: cleanCountryCode(data.countryCode),
      city: cleanString(data.city),
      isp: cleanString(data.isp) || cleanString(data.org),
      asn: formatAsn(data.as),
    };
  } catch (error: unknown) {
    return {
      provider: "ip-api",
      url,
      ok: false,
      error: getErrorMessage(error),
    };
  }
}

export async function lookupIpwhois(ip: string): Promise<ProviderResult> {
  const url = `https://ipwho.is/${ip}`;
  try {
    const response = await axios.get<IpwhoisResponse>(url, { timeout: 8000 });
    const data = response.data;
    if (data.success !== true) {
      return {
        provider: "ipwho.is",
        url,
        ok: false,
        error: cleanString(data.message) || "Lookup failed",
      };
    }
    return {
      provider: "ipwho.is",
      url,
      ok: true,
      country: cleanString(data.country),
      countryCode: cleanCountryCode(data.country_code),
      city: cleanString(data.city),
      isp: cleanString(data.connection?.isp) || cleanString(data.connection?.org),
      asn: formatAsn(data.connection?.asn),
    };
  } catch (error: unknown) {
    return {
      provider: "ipwho.is",
      url,
      ok: false,
      error: getErrorMessage(error),
    };
  }
}

export async function lookupIpapiIs(ip: string): Promise<ProviderResult> {
  const url = `https://api.ipapi.is/?q=${encodeURIComponent(ip)}`;
  try {
    const response = await axios.get<IpapiIsResponse>(url, {
      timeout: 8000,
      headers: {
        Accept: "application/json",
        "User-Agent": "Mozilla/5.0 (compatible; RaycastExtension)",
      },
    });
    const data = response.data;
    if (cleanString(data.error)) {
      return { provider: "ipapi.is", url, ok: false, error: cleanString(data.error) };
    }
    if (data.is_bogon) {
      return { provider: "ipapi.is", url, ok: false, error: "Private or reserved address" };
    }
    const country = cleanString(data.location?.country) || cleanString(data.country);
    const company =
      data.company && typeof data.company === "object" ? cleanString(data.company.name) : cleanString(data.company);
    let asnText: string | undefined;
    if (data.asn && typeof data.asn === "object") {
      const org = cleanString(data.asn.org);
      asnText = data.asn.asn ? `AS${data.asn.asn}${org ? ` ${org}` : ""}` : undefined;
    } else {
      asnText = cleanString(data.asn);
    }
    if (!country && !asnText && !company) {
      return { provider: "ipapi.is", url, ok: false, error: "No data returned" };
    }
    return {
      provider: "ipapi.is",
      url,
      ok: true,
      country,
      countryCode: cleanString(data.location?.country_code)?.toUpperCase() || countryCodeFromName(country),
      city: cleanString(data.location?.city) || cleanString(data.city),
      isp: company || asnText?.replace(/^AS\d+\s*/i, ""),
      asn: formatAsn(asnText),
    };
  } catch (error: unknown) {
    return {
      provider: "ipapi.is",
      url,
      ok: false,
      error: getErrorMessage(error),
    };
  }
}

export async function lookupIpinfo(ip: string): Promise<ProviderResult> {
  const url = `https://ipinfo.io/${ip}/json`;
  try {
    const response = await axios.get<IpinfoResponse>(url, {
      timeout: 8000,
      headers: {
        Accept: "application/json",
        "User-Agent": "Mozilla/5.0 (compatible; RaycastExtension)",
      },
    });
    const data = response.data;
    if (data.bogon === true) {
      return {
        provider: "ipinfo",
        url,
        ok: false,
        error: "Bogon IP address",
      };
    }
    if (data.error) {
      let errorMsg = "Lookup failed";
      if (typeof data.error === "string") {
        errorMsg = data.error;
      } else if (typeof data.error === "object" && data.error !== null) {
        errorMsg = data.error.message || data.error.title || "Lookup failed";
      }
      return {
        provider: "ipinfo",
        url,
        ok: false,
        error: errorMsg,
      };
    }
    if (!data.country && !data.org) {
      return {
        provider: "ipinfo",
        url,
        ok: false,
        error: "No data returned",
      };
    }
    const countryCode = cleanCountryCode(data.country);
    const country = deriveCountryName(countryCode);
    let isp: string | undefined;
    const orgStr = cleanString(data.org);
    if (orgStr) {
      const match = orgStr.match(/^AS\d+\s+(.+)$/i);
      if (match) {
        isp = cleanString(match[1]);
      } else if (!/^AS\d+$/i.test(orgStr)) {
        isp = orgStr;
      }
    }
    return {
      provider: "ipinfo",
      url,
      ok: true,
      country,
      countryCode,
      city: cleanString(data.city),
      isp,
      asn: formatAsn(data.org),
    };
  } catch (error: unknown) {
    return {
      provider: "ipinfo",
      url,
      ok: false,
      error: getErrorMessage(error),
    };
  }
}

export async function lookupRdap(ip: string): Promise<ProviderResult> {
  const url = `https://rdap.org/ip/${ip}`;
  try {
    const response = await axios.get<RdapResponse>(url, {
      timeout: 8000,
      headers: {
        Accept: "application/rdap+json, application/json",
        "User-Agent": "Mozilla/5.0 (compatible; RaycastExtension)",
      },
      maxRedirects: 5,
    });
    const data = response.data;
    if (data.errorCode) {
      return {
        provider: "RDAP",
        url,
        ok: false,
        error: cleanString(data.title) || cleanString(data.description?.[0]) || "Lookup failed",
      };
    }
    if (data.error) {
      return {
        provider: "RDAP",
        url,
        ok: false,
        error: cleanString(data.error) || "Lookup failed",
      };
    }
    if (!data.name && !data.country && !data.port43) {
      return {
        provider: "RDAP",
        url,
        ok: false,
        error: "No data returned",
      };
    }

    let registry = cleanString(data.port43);
    if (!registry && response.request && typeof response.request === "object") {
      const req = response.request as { host?: unknown };
      if (typeof req.host === "string" && req.host.trim().length > 0) {
        registry = req.host.trim();
      }
    }

    const name = cleanString(data.name);
    let isp: string | undefined;
    if (name && registry) {
      isp = `${name} (${registry})`;
    } else {
      isp = name || registry;
    }

    const countryCode = cleanCountryCode(data.country);
    const country = deriveCountryName(countryCode);

    return {
      provider: "RDAP",
      url,
      ok: true,
      country,
      countryCode,
      city: undefined,
      isp,
      asn: formatAsn(data.autnum || data.asn),
    };
  } catch (error: unknown) {
    return {
      provider: "RDAP",
      url,
      ok: false,
      error: getErrorMessage(error),
    };
  }
}

export async function compareProviders(ip: string): Promise<ProviderResult[]> {
  const cleanIp = ip.trim();
  return Promise.all([
    lookupIpApi(cleanIp),
    lookupIpwhois(cleanIp),
    lookupIpapiIs(cleanIp),
    lookupIpinfo(cleanIp),
    lookupRdap(cleanIp),
  ]);
}

export function summarize(results: ProviderResult[]): ProviderSummary {
  const withCountry = results.filter((r) => r.ok && cleanCountryCode(r.countryCode));
  const responding = withCountry.length;

  if (withCountry.length === 0) {
    return {
      agreeing: 0,
      responding,
      disagree: false,
    };
  }

  const counts = new Map<string, number>();
  const countryNames = new Map<string, string>();

  for (const r of withCountry) {
    const code = cleanCountryCode(r.countryCode)!;
    counts.set(code, (counts.get(code) || 0) + 1);
    if (!countryNames.has(code)) {
      const name = cleanString(r.country) || deriveCountryName(code);
      if (name) {
        countryNames.set(code, name);
      }
    }
  }

  let majorityCode: string | undefined;
  let maxCount = 0;

  for (const [code, count] of counts.entries()) {
    if (count > maxCount) {
      maxCount = count;
      majorityCode = code;
    }
  }

  const disagree = counts.size > 1;
  const country = majorityCode ? countryNames.get(majorityCode) || deriveCountryName(majorityCode) : undefined;

  return {
    countryCode: majorityCode,
    country,
    agreeing: maxCount,
    responding,
    disagree,
  };
}

export function formatProviderSummary(result: ProviderResult): string {
  if (!result.ok) {
    return `${result.provider}: Error: ${result.error || "Lookup failed"}`;
  }
  const details = [result.country, result.city, result.isp, result.asn].filter(
    (item): item is string => typeof item === "string" && item.trim().length > 0,
  );
  if (details.length === 0) {
    return `${result.provider}: No details`;
  }
  return `${result.provider}: ${details.join(", ")}`;
}

export function formatOverallSummary(ip: string, summary: ProviderSummary): string {
  const status = summary.disagree
    ? "Providers disagree on the country"
    : `${summary.agreeing} of ${summary.responding} providers agree`;
  const country = summary.country || "No country data";
  return `${ip}: ${country} (${status})`;
}
