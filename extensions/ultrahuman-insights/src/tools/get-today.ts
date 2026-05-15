import { getDay } from "../lib/cache";
import { today } from "../lib/format";

/**
 * Returns a snapshot of all of today's available Ultrahuman metrics.
 * Use when the user asks "how am I today", "how did I sleep", "what's my recovery",
 * or any unscoped question about current health state.
 */
export default async function tool() {
  const dateStr = today();
  const { data, stale } = await getDay(dateStr);
  return {
    date: dateStr,
    as_of: new Date().toISOString(),
    stale,
    metrics: data,
  };
}
