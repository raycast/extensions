import { getHistory } from "../lib/client";

type Input = {
  /** How many of the most recent switches to return (1 to 200). Defaults to 50. */
  limit?: number;
};

/** Newest first. source: rule = a scene decided, hand = the user picked, system = macOS changed it. */
export default async function tool({ limit }: Input) {
  const items = await getHistory(Math.min(Math.max(limit ?? 50, 1), 200));
  return items.map((i) => ({
    time: i.date,
    source: i.source,
    what: i.headline,
    microphone: i.input ?? null,
    speakers: i.output ?? null,
  }));
}
