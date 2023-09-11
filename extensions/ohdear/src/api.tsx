import { getPreferenceValues } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import fetch from "node-fetch";
import { CertificateHealth, Item, Preferences, Site, Uptime, User } from "./interface";
import { ohdearUrl } from "./utils/constants";
import { getDateRange } from "./utils/get-range";
import { sortSites } from "./utils/site-sorting";

export function getUserInfo() {
  const preferences = getPreferenceValues<Preferences>();

  return useFetch(`${ohdearUrl}/api/me`, {
    headers: {
      Authorization: `Bearer ${preferences.apiKey}`,
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    keepPreviousData: true,
    async parseResponse(response) {
      const data = (await response.json()) as User;
      return data;
    },
  });
}

export function getSites() {
  const preferences = getPreferenceValues<Preferences>();

  return useFetch(`${ohdearUrl}/api/sites`, {
    headers: {
      Authorization: `Bearer ${preferences.apiKey}`,
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    keepPreviousData: true,
    async parseResponse(response) {
      const data = (await response.json()) as any;
      const sortedSites = sortSites(data?.data);
      return sortedSites as { [key: string]: Site[] };
    },
  });
}

export function getUptime(site: Site) {
  const preferences = getPreferenceValues<Preferences>();

  const dateRange = getDateRange();
  const formattedStartDate = dateRange[0];
  const formattedEndDate = dateRange[1];

  return useFetch(
    `${ohdearUrl}/api/sites/${site.id}/uptime?filter[started_at]=${formattedStartDate}&filter[ended_at]=${formattedEndDate}&split=day`,
    {
      headers: {
        Authorization: `Bearer ${preferences.apiKey}`,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      keepPreviousData: true,
      async parseResponse(response) {
        const data = (await response.json()) as Uptime[];
        return data;
      },
    }
  );
}

export function getDowntime(site: Site) {
  const preferences = getPreferenceValues<Preferences>();

  const dateRange = getDateRange();
  const formattedStartDate = dateRange[0];
  const formattedEndDate = dateRange[1];

  return useFetch(
    `${ohdearUrl}/api/sites/${site.id}/downtime?filter[started_at]=${formattedStartDate}&filter[ended_at]=${formattedEndDate}&split=day`,
    {
      headers: {
        Authorization: `Bearer ${preferences.apiKey}`,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      keepPreviousData: true,
      async parseResponse(response) {
        const data = (await response.json()) as any;
        return data?.data;
      },
    }
  );
}

export function getBrokenLinks(site: Site) {
  const preferences = getPreferenceValues<Preferences>();

  return useFetch(`${ohdearUrl}/api/broken-links/${site.id}`, {
    headers: {
      Authorization: `Bearer ${preferences.apiKey}`,
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    keepPreviousData: true,
    async parseResponse(response) {
      const data = (await response.json()) as any;
      return data?.data;
    },
  });
}

export function getCertificateHealth(site: Site) {
  const preferences = getPreferenceValues<Preferences>();

  return useFetch(`${ohdearUrl}/api/certificate-health/${site.id}`, {
    headers: {
      Authorization: `Bearer ${preferences.apiKey}`,
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    keepPreviousData: true,
    async parseResponse(response) {
      const data = (await response.json()) as CertificateHealth;
      return data;
    },
  });
}

export function getMixedContent(site: Site) {
  const preferences = getPreferenceValues<Preferences>();

  return useFetch(`${ohdearUrl}/api/mixed-content/${site.id}`, {
    headers: {
      Authorization: `Bearer ${preferences.apiKey}`,
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    keepPreviousData: true,
    async parseResponse(response) {
      const data = (await response.json()) as any;
      return data?.data;
    },
  });
}

export function getPerformanceRecords(site: Site) {
  const preferences = getPreferenceValues<Preferences>();

  const dateRange = getDateRange();
  const formattedStartDate = dateRange[0];
  const formattedEndDate = dateRange[1];

  return useFetch(
    `${ohdearUrl}/api/sites/${site.id}/performance-records?filter[start]=${formattedStartDate}&filter[end]=${formattedEndDate}&split=day&filter[group_by]=minute`,
    {
      headers: {
        Authorization: `Bearer ${preferences.apiKey}`,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      keepPreviousData: true,
      async parseResponse(response) {
        const data = (await response.json()) as any;
        return data?.data;
      },
    }
  );
}

export function getDNSRecords(site: Site) {
  const preferences = getPreferenceValues<Preferences>();

  return useFetch(`${ohdearUrl}/api/sites/${site.id}/dns-history-items`, {
    headers: {
      Authorization: `Bearer ${preferences.apiKey}`,
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    keepPreviousData: true,
    async parseResponse(response) {
      const data = (await response.json()) as any;
      return data?.data;
    },
  });
}

export async function createSite(item: Item) {
  const preferences = getPreferenceValues<Preferences>();

  return await fetch(`${ohdearUrl}/api/sites`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${preferences.apiKey}`,
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(item),
  });
}

export function deleteSite(item: Site) {
  const preferences = getPreferenceValues<Preferences>();

  return fetch(`${ohdearUrl}/api/sites/${item.id}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${preferences.apiKey}`,
      Accept: "application/json",
      "Content-Type": "application/json",
    },
  });
}
