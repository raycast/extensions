import fetch from "node-fetch";
import { getPreferenceValues } from "@raycast/api";
import type { StatsQueryResponse, Stats } from "./types";

const { apiKey } = getPreferenceValues();

export async function verifySite(domain: string): Promise<boolean> {
  const response = await fetch(`https://plausible.io/api/v1/stats/aggregate?metrics=visits&site_id=${domain}`, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  });

  const data = (await response.json()) as StatsQueryResponse;

  if ("error" in data) {
    return false;
  } else {
    return true;
  }
}

export async function getWebsiteStats(domain: string): Promise<Stats> {
  const response = await fetch(
    `https://plausible.io/api/v1/stats/aggregate?metrics=visits,visitors,bounce_rate,pageviews,visit_duration&site_id=${domain}`,
    {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    }
  );

  const data = (await response.json()) as StatsQueryResponse;

  return (data.results as Stats) || (data.error as string);
}

export async function getStatsForAllWebsites(domains: string[]): Promise<{
  [key: string]: Stats;
}> {
  const promises = domains.map((domain) => getWebsiteStats(domain));
  const data = await Promise.all(promises);

  const stats = domains.reduce((acc, domain, index) => {
    acc[domain] = data[index];
    return acc;
  }, {} as { [key: string]: Stats });

  return stats;
}
