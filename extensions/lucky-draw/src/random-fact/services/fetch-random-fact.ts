import { pickRandom, shuffleList } from "../../shared";
import { RANDOM_FACT_SOURCES } from "../sources";
import type { RandomFactSelection } from "../types";

type HistoryResponse = {
  readonly json: () => Promise<unknown>;
  readonly ok: boolean;
};

export type RandomFactFetch = (url: string) => Promise<HistoryResponse>;

export type FetchRandomFactOptions = {
  readonly date?: Date;
  readonly fetchImpl?: RandomFactFetch;
  readonly random?: () => number;
};

export async function fetchRandomFact(options: FetchRandomFactOptions = {}): Promise<RandomFactSelection> {
  const random = options.random ?? Math.random;
  // Shuffle sources so retries both diversify results and avoid one flaky source always going first.
  const sources = shuffleList(RANDOM_FACT_SOURCES, random);
  const date = options.date ?? new Date();
  const fetchImpl = options.fetchImpl ?? fetch;

  for (const source of sources) {
    let response: HistoryResponse;

    try {
      response = await fetchImpl(source.buildUrl(date));
    } catch {
      continue;
    }

    if (!response.ok) {
      continue;
    }

    let payload: unknown;

    try {
      payload = await response.json();
    } catch {
      continue;
    }

    try {
      const events = source.parse(payload);
      // Some providers return many items for the same request, so pick one to reduce repetition.
      const event = events.length > 0 ? pickRandom(events, random) : null;

      if (!event) {
        continue;
      }

      return { event, source };
    } catch {
      continue;
    }
  }

  throw new Error("Unable to load a random fact.");
}
