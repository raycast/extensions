import type { DayStatus } from "@/types";
import type {
  StatuspageComponentUptime,
  StatuspageUptimeData,
  StatuspageUptimeDay,
} from "@/types/statuspage";

/** Statuspage weights partial outages at 30% of elapsed seconds; major at 100%. */
const OUTAGE_WEIGHT: Record<"m" | "p" | "d", number> = {
  m: 1,
  p: 0.3,
  d: 0.1,
};

const SECONDS_PER_DAY = 24 * 60 * 60;

function extractBalancedObject(text: string, openIndex: number): string | null {
  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = openIndex; i < text.length; i++) {
    const char = text[i];

    if (escaped) {
      escaped = false;
      continue;
    }
    if (char === "\\") {
      escaped = true;
      continue;
    }
    if (char === '"') {
      inString = !inString;
      continue;
    }
    if (inString) {
      continue;
    }
    if (char === "{") {
      depth++;
    } else if (char === "}") {
      depth--;
      if (depth === 0) {
        return text.slice(openIndex, i + 1);
      }
    }
  }

  return null;
}

/** Parse `window.uptimeData` from Statuspage HTML. Best effort: {}. */
export function parseStatuspageUptimeHtml(html: string): StatuspageUptimeData {
  try {
    const marker = "window.uptimeData = ";
    const markerIndex = html.indexOf(marker);
    if (markerIndex === -1) {
      return {};
    }

    const openIndex = html.indexOf("{", markerIndex + marker.length);
    if (openIndex === -1) {
      return {};
    }

    const objectText = extractBalancedObject(html, openIndex);
    if (!objectText) {
      return {};
    }

    return JSON.parse(objectText) as StatuspageUptimeData;
  } catch {
    return {};
  }
}

/**
 * Statuspage has no public v2 endpoint for the 90-day chart; day-level outage
 * seconds are embedded on the page as `window.uptimeData`. Best effort: {}.
 */
export async function fetchStatuspageUptimeData(
  siteUrl: string,
): Promise<StatuspageUptimeData> {
  try {
    const response = await fetch(siteUrl, {
      headers: { Accept: "text/html" },
    });

    if (!response.ok) {
      return {};
    }

    return parseStatuspageUptimeHtml(await response.text());
  } catch {
    return {};
  }
}

function outageSeconds(day: StatuspageUptimeDay): {
  m: number;
  p: number;
  d: number;
} {
  const outages = day.outages ?? {};
  return {
    m: outages.m ?? 0,
    p: outages.p ?? 0,
    d: outages.d ?? 0,
  };
}

export function dayLevelFromUptimeDay(
  day: StatuspageUptimeDay,
): DayStatus["level"] {
  const { m, p, d } = outageSeconds(day);
  if (m > 0) {
    return "major";
  }
  if (p > 0) {
    return "partial";
  }
  if (d > 0) {
    return "degraded";
  }
  return "operational";
}

export function buildHistoryFromUptimeDays(
  days: StatuspageUptimeDay[],
): DayStatus[] {
  return days.map((day) => ({
    date: day.date.slice(0, 10),
    level: dayLevelFromUptimeDay(day),
  }));
}

export function calcStatuspageUptimePercent(
  days: StatuspageUptimeDay[],
): number | undefined {
  if (days.length === 0) {
    return undefined;
  }

  let downtime = 0;
  for (const day of days) {
    const { m, p, d } = outageSeconds(day);
    downtime += m * OUTAGE_WEIGHT.m + p * OUTAGE_WEIGHT.p + d * OUTAGE_WEIGHT.d;
  }

  return (1 - downtime / (days.length * SECONDS_PER_DAY)) * 100;
}

export function componentUptimeFromData(
  uptime: StatuspageComponentUptime | undefined,
): { historyDays: DayStatus[]; uptimePercent?: number } | undefined {
  if (!uptime?.days?.length) {
    return undefined;
  }

  return {
    historyDays: buildHistoryFromUptimeDays(uptime.days),
    uptimePercent: calcStatuspageUptimePercent(uptime.days),
  };
}
