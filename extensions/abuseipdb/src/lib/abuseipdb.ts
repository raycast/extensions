import { getPreferenceValues } from "@raycast/api";

export const CHECK_ENDPOINT = "https://api.abuseipdb.com/api/v2/check";

export type AbuseReport = {
  reportedAt: string;
  comment: string;
  categories: number[];
  reporterId: number;
  reporterCountryCode: string | null;
  reporterCountryName: string | null;
};

export type CheckResult = {
  ipAddress: string;
  isPublic: boolean;
  ipVersion: number;
  isWhitelisted: boolean | null;
  abuseConfidenceScore: number;
  countryCode: string | null;
  countryName?: string | null;
  usageType: string | null;
  isp: string | null;
  domain: string | null;
  hostnames: string[];
  isTor: boolean;
  totalReports: number;
  numDistinctUsers: number;
  lastReportedAt: string | null;
  reports?: AbuseReport[];
};

/** https://www.abuseipdb.com/categories */
export const CATEGORIES: Record<number, string> = {
  1: "DNS Compromise",
  2: "DNS Poisoning",
  3: "Fraud Orders",
  4: "DDoS Attack",
  5: "FTP Brute-Force",
  6: "Ping of Death",
  7: "Phishing",
  8: "Fraud VoIP",
  9: "Open Proxy",
  10: "Web Spam",
  11: "Email Spam",
  12: "Blog Spam",
  13: "VPN IP",
  14: "Port Scan",
  15: "Hacking",
  16: "SQL Injection",
  17: "Spoofing",
  18: "Brute-Force",
  19: "Bad Web Bot",
  20: "Exploited Host",
  21: "Web App Attack",
  22: "SSH",
  23: "IoT Targeted",
};

export function categoryNames(ids: number[]): string[] {
  return ids.map((id) => CATEGORIES[id] ?? `Category ${id}`);
}

export function checkUrl(ip: string): string {
  const { maxAgeInDays, verbose } = getPreferenceValues<Preferences>();
  const params = new URLSearchParams({
    ipAddress: ip,
    maxAgeInDays: maxAgeInDays && maxAgeInDays.length > 0 ? maxAgeInDays : "90",
  });
  if (verbose !== false) {
    params.append("verbose", "");
  }
  return `${CHECK_ENDPOINT}?${params.toString()}`;
}

export function requestHeaders(): Record<string, string> {
  const { apiKey } = getPreferenceValues<Preferences>();
  return { Key: apiKey, Accept: "application/json" };
}

export async function parseCheckResponse(response: Response): Promise<CheckResult> {
  const body = (await response.json()) as { data?: CheckResult; errors?: { detail?: string }[] };

  if (!response.ok) {
    const detail = body?.errors?.[0]?.detail;
    switch (response.status) {
      case 401:
        throw new Error(detail ?? "Invalid API key. Check the extension preferences.");
      case 402:
      case 429:
        throw new Error(detail ?? "Rate limit reached. AbuseIPDB caps free plans at 1,000 checks per day.");
      case 422:
        throw new Error(detail ?? "AbuseIPDB rejected that IP address.");
      default:
        throw new Error(detail ?? `AbuseIPDB returned HTTP ${response.status}.`);
    }
  }

  if (!body?.data) {
    throw new Error("AbuseIPDB returned an unexpected response.");
  }

  return body.data;
}

export function webUrl(ip: string): string {
  return `https://www.abuseipdb.com/check/${encodeURIComponent(ip)}`;
}

export function reportUrl(ip: string): string {
  return `https://www.abuseipdb.com/report?ip=${encodeURIComponent(ip)}`;
}
