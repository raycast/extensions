import { FlowseryApi } from "./client";
import { RangeId, reportWindow, websiteKey, websiteSelector } from "./format";
import { BreakdownRow, Overview, Website } from "./types";

const BREAKDOWN_LIMIT = 5;
const MAX_LIVE_WEBSITES = 20;

export type WebsiteReport = {
  overview?: Overview;
  liveVisitors?: number;
  pages: BreakdownRow[];
  referrers: BreakdownRow[];
  countries: BreakdownRow[];
};

export type LiveCounts = {
  counts: Record<string, number>;
  unavailable: string[];
  omitted: number;
};

export async function loadWebsiteReport(
  flowsery: FlowseryApi,
  website: Website,
  rangeId: RangeId,
  now: Date,
  timezone: string,
): Promise<WebsiteReport> {
  const selector = websiteSelector(website);
  const window = reportWindow(rangeId, now, timezone);
  const [overview, realtime, pages, referrers, countries] = await Promise.all([
    flowsery.getOverview(selector, window),
    flowsery.getRealtime(selector),
    flowsery.getBreakdown("pages", selector, window, BREAKDOWN_LIMIT),
    flowsery.getBreakdown("referrers", selector, window, BREAKDOWN_LIMIT),
    flowsery.getBreakdown("countries", selector, window, BREAKDOWN_LIMIT),
  ]);
  return {
    overview: overview.data[0],
    liveVisitors: realtime.data[0]?.visitors,
    pages: pages.data,
    referrers: referrers.data,
    countries: countries.data,
  };
}

export async function loadLiveCounts(flowsery: FlowseryApi, websites: Website[]): Promise<LiveCounts> {
  const tracked = websites.slice(0, MAX_LIVE_WEBSITES);
  const results = await Promise.allSettled(tracked.map((website) => flowsery.getRealtime(websiteSelector(website))));
  const counts: Record<string, number> = {};
  const unavailable: string[] = [];
  results.forEach((result, index) => {
    const key = websiteKey(tracked[index]);
    if (result.status === "fulfilled") counts[key] = result.value.data[0]?.visitors ?? 0;
    else unavailable.push(key);
  });
  return { counts, unavailable, omitted: websites.length - tracked.length };
}
