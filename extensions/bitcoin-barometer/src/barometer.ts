export const FEED_URL = "https://nakamotonotes.com/open/barometer.json";
export const METHODOLOGY_URL = "https://nakamotonotes.com/methodology";
const USER_AGENT = "nakamotonotes-raycast/1.0.0";

export interface Reading {
  score: number;
  zone: string;
  computedAt: string;
  change7dPct: number | null;
  methodologyUrl: string;
}

export class BarometerError extends Error {
  status?: number;
  constructor(message: string, status?: number) {
    super(message);
    this.status = status;
  }
}

export function describeError(error: Error): string {
  return error instanceof BarometerError && error.status !== undefined
    ? `${error.message} (HTTP ${error.status})`
    : error.message;
}

export async function fetchBarometer(): Promise<Reading> {
  let res: Response;
  try {
    res = await fetch(FEED_URL, {
      headers: { "User-Agent": USER_AGENT },
      signal: AbortSignal.timeout(10000),
    });
  } catch (e) {
    if (e instanceof Error && e.name === "TimeoutError")
      throw new BarometerError("Request timed out after 10s");
    throw new BarometerError(
      `Network error: ${e instanceof Error ? e.message : String(e)}`,
    );
  }
  if (res.status !== 200)
    throw new BarometerError(`Feed returned HTTP ${res.status}`, res.status);
  type Body = {
    score?: unknown;
    zone?: unknown;
    computedAt?: unknown;
    price?: { change7dPct?: unknown };
  } | null;
  let text: string;
  try {
    text = await res.text();
  } catch (e) {
    if (e instanceof Error && e.name === "TimeoutError")
      throw new BarometerError("Request timed out after 10s");
    throw new BarometerError(
      `Network error while reading the feed: ${e instanceof Error ? e.message : String(e)}`,
    );
  }
  let body: Body;
  try {
    body = JSON.parse(text);
  } catch {
    throw new BarometerError("Feed returned malformed JSON", 200);
  }
  if (!body || typeof body !== "object")
    throw new BarometerError("Feed returned an unexpected shape", 200);
  const { score, zone, computedAt } = body;
  if (
    typeof score !== "number" ||
    !Number.isInteger(score) ||
    score < 0 ||
    score > 100
  )
    throw new BarometerError("Feed score is invalid", 200);
  if (typeof zone !== "string" || zone === "")
    throw new BarometerError("Feed zone is invalid", 200);
  if (typeof computedAt !== "string" || Number.isNaN(Date.parse(computedAt)))
    throw new BarometerError("Feed computedAt is invalid", 200);
  const change = body.price?.change7dPct;
  if (change !== undefined && change !== null && typeof change !== "number")
    throw new BarometerError("Feed 7-day change is invalid", 200);
  return {
    score,
    zone,
    computedAt,
    change7dPct: change ?? null,
    methodologyUrl: METHODOLOGY_URL,
  };
}
