import type { RamRadarPoint, RamRadarResponse } from "../types/market-trends";

const MARKET_TRENDS_URL = "https://ramradar.app/api/market-trends";

function isRamRadarPoint(value: unknown): value is RamRadarPoint {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const candidate = value as Record<string, unknown>;

  return (
    typeof candidate.date === "string" &&
    typeof candidate.avgPricePerGb === "number" &&
    Number.isFinite(candidate.avgPricePerGb) &&
    typeof candidate.productCount === "number" &&
    Number.isFinite(candidate.productCount)
  );
}

function parseSeries(value: unknown, generation: "ddr4" | "ddr5"): RamRadarPoint[] {
  if (!Array.isArray(value)) {
    throw new Error(`RAM Radar returned invalid ${generation} trend data`);
  }

  if (!value.every(isRamRadarPoint)) {
    throw new Error(`RAM Radar returned malformed ${generation} points`);
  }

  return value;
}

function parseRamRadarResponse(value: unknown): RamRadarResponse {
  if (typeof value !== "object" || value === null) {
    throw new Error("RAM Radar returned an invalid response body");
  }

  const candidate = value as Record<string, unknown>;

  return {
    ddr4: parseSeries(candidate.ddr4, "ddr4"),
    ddr5: parseSeries(candidate.ddr5, "ddr5"),
  };
}

export async function fetchMarketTrends(): Promise<RamRadarResponse> {
  const response = await fetch(MARKET_TRENDS_URL);

  if (!response.ok) {
    throw new Error(`RAM Radar request failed with ${response.status}`);
  }

  return parseRamRadarResponse(await response.json());
}
