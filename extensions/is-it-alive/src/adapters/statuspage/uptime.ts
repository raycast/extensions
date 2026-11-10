import type { DayStatus } from "@/types";
import { fetchJson } from "@/lib/fetch-json";
import type {
  StatuspageComponentUptime,
  StatuspageUptimeDay,
  StatuspageUptimeShowcase,
} from "@/adapters/statuspage/types";

/** Server-side limit of components per `/uptime_showcase` request. */
const SHOWCASE_BATCH_SIZE = 60;

/**
 * Statuspage lazy-loads the 90-day bars from `/uptime_showcase`. Pages without
 * the showcase (404) or with it disabled (empty) yield an empty map.
 */
export async function fetchStatuspageUptime(
  origin: string,
  componentIds: string[],
): Promise<Map<string, StatuspageComponentUptime>> {
  const uptime = new Map<string, StatuspageComponentUptime>();

  for (let i = 0; i < componentIds.length; i += SHOWCASE_BATCH_SIZE) {
    const batch = componentIds.slice(i, i + SHOWCASE_BATCH_SIZE);
    let showcase: StatuspageUptimeShowcase;
    try {
      showcase = await fetchJson<StatuspageUptimeShowcase>(
        `${origin}/uptime_showcase?components=${encodeURIComponent(batch.join(","))}`,
      );
    } catch {
      break;
    }

    const percents = new Map(
      (showcase.values ?? []).map((value) => [value.component, value.ninety]),
    );
    for (const [id, timeline] of Object.entries(showcase.timelines ?? {})) {
      uptime.set(id, {
        days: timeline.days,
        uptimePercent: percents.get(id),
      });
    }
  }

  return uptime;
}

export function dayLevelFromUptimeDay(
  day: StatuspageUptimeDay,
): DayStatus["level"] {
  const outages = day.outages ?? {};
  if (outages.m) {
    return "major";
  }
  if (outages.p) {
    return "partial";
  }
  if (outages.d) {
    return "degraded";
  }
  return "operational";
}
