import { getPreferenceValues } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import {
  BrokenLinks,
  CertificateHealth,
  DNSRecords,
  Downtimes,
  Item,
  MixedContents,
  PerformanceRecords,
  Preferences,
  Site,
  Sites,
  Uptime,
  User,
} from "./interface";
import { errorMessages, ohdearUrl } from "./utils/constants";
import { getDateRange } from "./utils/get-range";
import { sortSites } from "./utils/site-sorting";

function getHeaders() {
  const { apiKey } = getPreferenceValues<Preferences>();

  return {
    Authorization: `Bearer ${apiKey}`,
    Accept: "application/json",
    "Content-Type": "application/json",
  };
}

function useOhDear<T>(path: string, parseResponse: (response: Response) => Promise<T>) {
  return useFetch(`${ohdearUrl}/api${path}`, {
    headers: getHeaders(),
    keepPreviousData: true,
    parseResponse,
  });
}

export function getUserInfo() {
  return useOhDear("/me", async (response) => {
    const data = (await response.json()) as User;
    return data;
  });
}

export function getSites() {
  return useOhDear("/sites", async (response) => {
    const data = (await response.json()) as Sites;
    const sortedSites = sortSites(data?.data);
    return sortedSites;
  });
}

export function getUptime(site: Site) {
  const [formattedStartDate, formattedEndDate] = getDateRange();

  return useOhDear(
    `/sites/${site.id}/uptime?filter[started_at]=${formattedStartDate}&filter[ended_at]=${formattedEndDate}&split=day`,
    async (response) => {
      const data = (await response.json()) as Uptime[];
      return data;
    },
  );
}

export function getDowntime(site: Site) {
  const [formattedStartDate, formattedEndDate] = getDateRange();

  return useOhDear(
    `/sites/${site.id}/downtime?filter[started_at]=${formattedStartDate}&filter[ended_at]=${formattedEndDate}&split=day`,
    async (response) => {
      const data = (await response.json()) as Downtimes;
      return data?.data;
    },
  );
}

export function getBrokenLinks(site: Site) {
  return useOhDear(`/broken-links/${site.id}`, async (response) => {
    const data = (await response.json()) as BrokenLinks;
    return data?.data;
  });
}

export function getCertificateHealth(site: Site) {
  return useOhDear(`/certificate-health/${site.id}`, async (response) => {
    const data = (await response.json()) as CertificateHealth;
    return data;
  });
}

export function getMixedContent(site: Site) {
  return useOhDear(`/mixed-content/${site.id}`, async (response) => {
    const data = (await response.json()) as MixedContents;
    return data?.data;
  });
}

export function getPerformanceRecords(site: Site) {
  const [formattedStartDate, formattedEndDate] = getDateRange();

  return useOhDear(
    `/sites/${site.id}/performance-records?filter[start]=${formattedStartDate}&filter[end]=${formattedEndDate}&split=day&filter[group_by]=minute`,
    async (response) => {
      const data = (await response.json()) as PerformanceRecords;
      return data?.data;
    },
  );
}

export function getDNSRecords(site: Site) {
  return useOhDear(`/sites/${site.id}/dns-history-items`, async (response) => {
    const data = (await response.json()) as DNSRecords;
    return data?.data;
  });
}

async function checkResponse(response: Response) {
  if (response.ok) {
    return;
  }

  let message = `Oh Dear returned HTTP ${response.status} ${response.statusText}`.trim();
  try {
    const data: unknown = await response.json();
    if (
      typeof data === "object" &&
      data !== null &&
      "message" in data &&
      typeof data.message === "string" &&
      data.message.trim()
    ) {
      message = errorMessages[data.message] ?? data.message;
    }
  } catch {
    // Keep the HTTP status when the error response isn't JSON.
  }

  throw new Error(message);
}

export async function createSite(item: Item) {
  const response = await fetch(`${ohdearUrl}/api/sites`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify(item),
  });

  await checkResponse(response);
}

export async function deleteSite(item: Site) {
  const response = await fetch(`${ohdearUrl}/api/sites/${item.id}`, {
    method: "DELETE",
    headers: getHeaders(),
  });

  await checkResponse(response);
}
