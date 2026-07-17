import { fetchAggregatedMetrics } from "../lib/buffer";
import { computeDelta } from "../lib/format";

type Input = {
  /** The Buffer channel id. Resolve it first with the get-channels tool if the user gave a name. */
  channelId: string;
  /** Look-back window in days. Buffer's free plan supports up to 31 days. Defaults to 7. */
  days?: number;
};

function isoDaysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString();
}

export default async function (input: Input) {
  const days = Math.min(input.days ?? 7, 31);
  const now = new Date().toISOString();

  const current = await fetchAggregatedMetrics(input.channelId, isoDaysAgo(days), now);

  let previous: Awaited<ReturnType<typeof fetchAggregatedMetrics>> | null = null;
  try {
    previous = await fetchAggregatedMetrics(input.channelId, isoDaysAgo(days * 2), isoDaysAgo(days));
  } catch {
    previous = null; // comparison window may exceed the free-plan history limit
  }

  const prevByKey = new Map((previous?.metrics ?? []).map((m) => [m.type || m.name, m.value]));

  return {
    periodDays: days,
    metrics: current.metrics.map((m) => {
      const prev = prevByKey.get(m.type || m.name);
      const delta = prev !== undefined ? computeDelta(m.value, prev) : null;
      return {
        name: m.name,
        value: m.value,
        unit: m.unit,
        changePercent: delta ? delta.pct : null,
        changeDirection: delta ? delta.direction : "no prior data",
      };
    }),
  };
}
