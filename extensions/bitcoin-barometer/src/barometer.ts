export const FEED_URL = "https://nakamotonotes.com/open/barometer.json";
export const METHODOLOGY_URL = "https://nakamotonotes.com/methodology";
const USER_AGENT = "nakamotonotes-raycast/1.0.0";

export interface Reading {
  score: number;
  zone: string;
  computedAt: string;
  change7dPct: number | null;
  usd: number | null;
  change24hPct: number | null;
  methodologyUrl: string;
}

// Price is optional in the feed (omitted when the price source is down): absent or non-finite stays null, never a substitute number.
function finiteOrNull(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

export function formatUsd(usd: number): string {
  return `$${usd.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

export function formatChange(pct: number): string {
  return `${pct >= 0 ? "+" : "-"}${Math.abs(pct).toFixed(2)}%`;
}

// Price first, with the 24h change when the feed has it; null when there is no price.
export function priceLine(r: Reading): string | null {
  if (r.usd === null || r.usd <= 0) return null;
  return r.change24hPct === null
    ? formatUsd(r.usd)
    : `${formatUsd(r.usd)} (${formatChange(r.change24hPct)} 24h)`;
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
    price?: { usd?: unknown; change24hPct?: unknown; change7dPct?: unknown };
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
    usd: finiteOrNull(body.price?.usd),
    change24hPct: finiteOrNull(body.price?.change24hPct),
    methodologyUrl: METHODOLOGY_URL,
  };
}
