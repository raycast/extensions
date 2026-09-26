import * as cheerio from "cheerio";

const SOURCE_URL = "https://psopk.com/en/fuels/fuel-prices";
const FETCH_TIMEOUT_MS = 8000;

const BROWSER_USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

export interface FuelPrice {
  product: string;
  /** Raw display string exactly as shown on PSO's site, e.g. "Rs.391.30/Ltr". */
  price: string;
  /** Numeric value extracted from `price`, for sorting/formatting. Null if unparseable. */
  value: number | null;
}

export interface FuelPriceSection {
  title: string;
  effectiveFrom: string | null;
  prices: FuelPrice[];
}

/**
 * Fetches the PSO fuel prices page and parses the POL / Octane+ / LPG price
 * tables from it. Aborts after FETCH_TIMEOUT_MS so a slow/unreachable server
 * never hangs the Raycast command indefinitely.
 */
export async function fetchFuelPrices(): Promise<FuelPriceSection[]> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(SOURCE_URL, {
      headers: { "User-Agent": BROWSER_USER_AGENT },
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`PSO site returned HTTP ${response.status}`);
    }

    const html = await response.text();
    return parseFuelPrices(html);
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error("Timed out reaching psopk.com — check your connection and try again.");
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}

const EFFECTIVE_FROM_RE = /Effective From:?\s*([A-Za-z0-9 ,]+?)(?:\n|$)/;
const NUMBER_RE = /[\d,]+\.?\d*/;
const SKIPPED_HEADER_LABELS = new Set(["product name", "locations", "title"]);

export function parseFuelPrices(html: string): FuelPriceSection[] {
  // xmlMode:false + minimal options keeps cheerio's parse fast; we only ever
  // need CSS-selector traversal, not full DOM mutation.
  const $ = cheerio.load(html);
  const rawSections: FuelPriceSection[] = [];

  $("table").each((_, table) => {
    const $table = $(table);

    let effectiveFrom: string | null = null;
    const containerText = $table.closest("li, div, section").text();
    const match = containerText.match(EFFECTIVE_FROM_RE);
    if (match) {
      effectiveFrom = match[1].trim();
    }

    const prices: FuelPrice[] = [];
    $table.find("tr").each((__, row) => {
      const cells = $(row)
        .find("td, th")
        .map((___, cell) => $(cell).text().trim())
        .get();

      if (cells.length !== 2) return;

      const [product, price] = cells;
      if (!product || !price) return;

      const lower = product.toLowerCase();
      if (SKIPPED_HEADER_LABELS.has(lower)) return;

      const numberMatch = price.match(NUMBER_RE);
      if (!numberMatch) return; // not a real price row (filters stray/document tables)

      prices.push({
        product,
        price,
        value: parseFloat(numberMatch[0].replace(/,/g, "")),
      });
    });

    if (prices.length > 0) {
      rawSections.push({ title: guessSectionTitle(prices), effectiveFrom, prices });
    }
  });

  // Keep only sections we can confidently label, and de-duplicate: PSO's page
  // renders every tab's table in the DOM even when visually hidden, so the
  // same POL table can otherwise appear more than once.
  const seen = new Set<string>();
  const sections: FuelPriceSection[] = [];
  for (const section of rawSections) {
    if (section.title === "Fuel Prices") continue; // unrecognized/irrelevant table
    const fingerprint = `${section.title}::${section.prices.map((p) => p.product).join("|")}`;
    if (seen.has(fingerprint)) continue;
    seen.add(fingerprint);
    sections.push(section);
  }

  return sections;
}

/** Best-effort label for a section based on the products it contains. */
function guessSectionTitle(prices: FuelPrice[]): string {
  const firstProduct = prices[0]?.product.toLowerCase() ?? "";
  if (firstProduct.includes("premier") || firstProduct.includes("cetane")) return "POL";
  if (firstProduct.includes("octane")) return "Octane+ Euro 5 (by city)";
  if (firstProduct.includes("lpg")) return "LPG";
  return "Fuel Prices";
}
