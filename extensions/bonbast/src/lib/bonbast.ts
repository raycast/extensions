import { CATALOG, CatalogItem } from "./catalog";

export interface RateItem extends CatalogItem {
  sell?: number;
  buy?: number;
  value?: number;
}

export interface Rates {
  items: RateItem[];
  updated: string;
}

const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15";

function pad2(val: string | number | undefined): string {
  if (val === undefined || val === null) return "00";
  return String(val).padStart(2, "0");
}

function toPositive(raw: string | number | undefined): number | undefined {
  if (raw === undefined || (typeof raw === "string" && raw.trim() === "")) return undefined;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

export async function fetchRates(): Promise<Rates> {
  const homeRes = await fetch("https://www.bonbast.com/", {
    headers: {
      "User-Agent": USER_AGENT,
    },
  });

  if (!homeRes.ok) {
    throw new Error(`Failed to load bonbast.com: ${homeRes.statusText}`);
  }

  const cookieHeaders =
    typeof homeRes.headers.getSetCookie === "function"
      ? homeRes.headers.getSetCookie()
      : homeRes.headers.get("set-cookie")
        ? [homeRes.headers.get("set-cookie")!]
        : [];

  const cookies = cookieHeaders
    .map((c) => c.split(";")[0].trim())
    .filter(Boolean)
    .join("; ");

  const html = await homeRes.text();
  const tokenMatch = html.match(/param:\s*"([^"]+)"/);
  if (!tokenMatch || !tokenMatch[1]) {
    throw new Error("Bonbast refused the request. Try again in a minute.");
  }
  const token = tokenMatch[1];

  const postRes = await fetch("https://www.bonbast.com/json", {
    method: "POST",
    headers: {
      "User-Agent": USER_AGENT,
      Cookie: cookies,
      "X-Requested-With": "XMLHttpRequest",
      Referer: "https://www.bonbast.com/",
      "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
    },
    body: new URLSearchParams({ param: token }).toString(),
  });

  if (!postRes.ok) {
    throw new Error(`Failed to fetch rates from bonbast.com: ${postRes.statusText}`);
  }

  const rawData = (await postRes.json()) as Record<string, string | number | undefined>;
  if (!rawData || !rawData.usd1) {
    throw new Error("Bonbast refused the request. Try again in a minute.");
  }

  const year = rawData.year ? String(rawData.year) : "";
  const month = pad2(rawData.month);
  const day = pad2(rawData.day);
  const hour = pad2(rawData.hour);
  const minute = pad2(rawData.minute);
  const updated = year ? `${year}/${month}/${day} ${hour}:${minute}` : `${hour}:${minute}`;

  const items: RateItem[] = [];

  for (const entry of CATALOG) {
    if (entry.sellKey && entry.buyKey) {
      const sell = toPositive(rawData[entry.sellKey]);
      const buy = toPositive(rawData[entry.buyKey]);
      if (sell === undefined || buy === undefined) continue;
      items.push({
        ...entry,
        sell,
        buy,
      });
    } else if (entry.valueKey) {
      const value = toPositive(rawData[entry.valueKey]);
      if (value === undefined) continue;
      items.push({
        ...entry,
        value,
      });
    }
  }

  return {
    items,
    updated,
  };
}

export function findItem(rates: Rates | RateItem[], query: string): RateItem | undefined {
  const items = Array.isArray(rates) ? rates : rates.items;
  const q = query.trim().toLowerCase();
  if (!q) return undefined;

  const exact = items.find((item) => {
    return item.id.toLowerCase() === q || (item.code && item.code.toLowerCase() === q) || item.name.toLowerCase() === q;
  });
  if (exact) return exact;

  return items.find((item) => {
    return (
      item.id.toLowerCase().includes(q) ||
      (item.code && item.code.toLowerCase().includes(q)) ||
      item.name.toLowerCase().includes(q)
    );
  });
}
