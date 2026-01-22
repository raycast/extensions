/**
 * Nordpool API client for electricity prices
 * Supports multiple regions across Europe
 */

import { getPreferenceValues } from "@raycast/api";

// Nordpool API configuration
const BASE_URL = "https://dataportal-api.nordpoolgroup.com/api/DayAheadPrices";
const CURRENCY = "EUR";

// Types
export interface PriceRow {
  moment: Date;
  hour: string;
  eurPerMwh: number;
  centsPerKwh: number;
  retailCentsPerKwh: number; // with VAT
}

interface NordpoolEntry {
  deliveryStart: string;
  deliveryEnd: string;
  entryPerArea: Record<string, number>;
}

interface NordpoolResponse {
  deliveryDateCET: string;
  multiAreaEntries: NordpoolEntry[];
}

export interface Preferences {
  region: string;
  vatRate: string;
  cheapThreshold: string;
  averageThreshold: string;
  highThreshold: string;
}

/**
 * Get user preferences with defaults
 */
export function getPrefs(): Preferences {
  return getPreferenceValues<Preferences>();
}

/**
 * Get VAT rate as a decimal (e.g., 0.24 for 24%)
 */
export function getVatRate(): number {
  const prefs = getPrefs();
  const vatPercent = parseFloat(prefs.vatRate) || 24;
  return vatPercent / 100;
}

/**
 * Get the selected region
 */
export function getRegion(): string {
  const prefs = getPrefs();
  return prefs.region || "EE";
}

/**
 * Build Nordpool API URL for a specific date and region
 */
function buildPricesUrl(date: Date, area: string): string {
  const dateStr = date.toISOString().split("T")[0];
  return `${BASE_URL}?currency=${CURRENCY}&market=DayAhead&deliveryArea=${area}&date=${dateStr}`;
}

/**
 * Fetch prices from Nordpool API
 */
async function fetchNordpoolPrices(date: Date, area: string): Promise<NordpoolResponse> {
  const url = buildPricesUrl(date, area);
  const response = await fetch(url, {
    headers: { "User-Agent": "raycast-electricity/1.0" },
  });

  if (!response.ok) {
    throw new Error(`Nordpool API error: ${response.status}`);
  }

  return response.json();
}

/**
 * Parse Nordpool entries into PriceRow objects
 */
function parseEntries(entries: NordpoolEntry[], startTime: Date, area: string, vatRate: number): PriceRow[] {
  const rows: PriceRow[] = [];

  for (const entry of entries) {
    const value = entry.entryPerArea[area];
    if (value === undefined) continue;

    const moment = new Date(entry.deliveryStart);
    if (moment < startTime) continue;

    const eurPerMwh = value;
    const centsPerKwh = eurPerMwh / 10;
    const retailCentsPerKwh = centsPerKwh * (1 + vatRate);

    rows.push({
      moment,
      hour: moment.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false }),
      eurPerMwh,
      centsPerKwh,
      retailCentsPerKwh,
    });
  }

  return rows;
}

/**
 * Aggregate 15-minute prices to hourly by averaging
 */
function aggregateToHourly(rows: PriceRow[]): PriceRow[] {
  const buckets = new Map<string, PriceRow[]>();

  for (const row of rows) {
    const hourStart = new Date(row.moment);
    hourStart.setMinutes(0, 0, 0);
    const key = hourStart.toISOString();

    if (!buckets.has(key)) {
      buckets.set(key, []);
    }
    buckets.get(key)!.push(row);
  }

  const aggregated: PriceRow[] = [];
  const sortedKeys = Array.from(buckets.keys()).sort();

  for (const key of sortedKeys) {
    const bucket = buckets.get(key)!;
    const moment = new Date(key);

    const avgEurMwh = bucket.reduce((sum, r) => sum + r.eurPerMwh, 0) / bucket.length;
    const avgCents = bucket.reduce((sum, r) => sum + r.centsPerKwh, 0) / bucket.length;
    const avgRetail = bucket.reduce((sum, r) => sum + r.retailCentsPerKwh, 0) / bucket.length;

    aggregated.push({
      moment,
      hour: moment.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false }),
      eurPerMwh: avgEurMwh,
      centsPerKwh: avgCents,
      retailCentsPerKwh: avgRetail,
    });
  }

  return aggregated;
}

/**
 * Fetch 24 hours of electricity prices from Nordpool
 */
export async function fetchPrices(): Promise<PriceRow[]> {
  const area = getRegion();
  const vatRate = getVatRate();

  const now = new Date();
  const startOfHour = new Date(now);
  startOfHour.setMinutes(0, 0, 0);

  // Fetch today's prices
  const todayData = await fetchNordpoolPrices(now, area);

  // Try to fetch tomorrow's prices (available after ~13:00 CET)
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);

  let tomorrowEntries: NordpoolEntry[] = [];
  try {
    const tomorrowData = await fetchNordpoolPrices(tomorrow, area);
    tomorrowEntries = tomorrowData.multiAreaEntries || [];
  } catch {
    // Tomorrow's prices not available yet
  }

  const allEntries = [...todayData.multiAreaEntries, ...tomorrowEntries];
  const rows = parseEntries(allEntries, startOfHour, area, vatRate);

  // Aggregate to hourly and limit to 24 hours
  const hourly = aggregateToHourly(rows);
  return hourly.slice(0, 24);
}

/**
 * Get the current hour's price
 */
export async function getCurrentPrice(): Promise<PriceRow | null> {
  const prices = await fetchPrices();
  return prices[0] || null;
}
