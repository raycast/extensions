export interface FinancialDetails {
  // Balance sheet
  totalAssets?: string;
  totalLiabilities?: string;
  totalEquity?: string;
  balanceSheetDate?: string;

  // Key statistics
  pegRatio?: string;
  enterpriseValue?: string;
  shortInterest?: string;
  shortPercentOfFloat?: string;

  // Earnings growth (Y/Y net income growth for most recent quarter, as decimal e.g. 0.298 = 29.8%)
  earningsGrowthYoY?: number;
}

const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

function formatLargeNumber(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1e12) return "$" + (value / 1e12).toFixed(2) + "T";
  if (abs >= 1e9) return "$" + (value / 1e9).toFixed(2) + "B";
  if (abs >= 1e6) return "$" + (value / 1e6).toFixed(2) + "M";
  if (abs >= 1e3) return "$" + (value / 1e3).toFixed(2) + "K";
  return "$" + value.toFixed(2);
}

function extractFieldValue(html: string, fieldId: string): string | undefined {
  // Matches {id:"fieldId",title:"...",value:"VALUE",...}
  const regex = new RegExp(`\\{id:"${fieldId}"[^}]*value:"([^"]*)"[^}]*\\}`);
  const match = html.match(regex);
  if (match && match[1] && match[1] !== "n/a") {
    return match[1];
  }
  return undefined;
}

async function fetchStatistics(symbol: string, signal?: AbortSignal): Promise<Partial<FinancialDetails>> {
  const url = `https://stockanalysis.com/stocks/${encodeURIComponent(symbol.toLowerCase())}/statistics/`;
  try {
    const response = await fetch(url, {
      headers: { "User-Agent": USER_AGENT },
      signal,
    });
    if (!response.ok) return {};
    const html = await response.text();

    const details: Partial<FinancialDetails> = {};

    const ev = extractFieldValue(html, "enterpriseValue");
    if (ev) details.enterpriseValue = ev;

    const peg = extractFieldValue(html, "pegRatio");
    if (peg) details.pegRatio = peg;

    const si = extractFieldValue(html, "shortInterest");
    if (si) details.shortInterest = si;

    const sf = extractFieldValue(html, "shortFloat");
    if (sf) details.shortPercentOfFloat = sf;

    return details;
  } catch (e) {
    if ((e as Error).name === "AbortError") throw e;
    return {};
  }
}

async function fetchBalanceSheet(symbol: string, signal?: AbortSignal): Promise<Partial<FinancialDetails>> {
  const url = `https://stockanalysis.com/stocks/${encodeURIComponent(symbol.toLowerCase())}/financials/balance-sheet/?p=quarterly`;
  try {
    const response = await fetch(url, {
      headers: { "User-Agent": USER_AGENT },
      signal,
    });
    if (!response.ok) return {};
    const html = await response.text();

    const details: Partial<FinancialDetails> = {};

    // Extract datekey array for the most recent quarter date
    const dateMatch = html.match(/datekey:\["([^"]+)"/);
    if (dateMatch && dateMatch[1]) {
      const d = new Date(dateMatch[1] + "T00:00:00");
      details.balanceSheetDate = d.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    }

    // Find all arrays for assets, liabilities, equity
    // The total row is the last occurrence with the largest values
    const assetsArrays = [...html.matchAll(/assets:\[([0-9,]+)\]/g)];
    const liabArrays = [...html.matchAll(/liabilities:\[([0-9,]+)\]/g)];
    const equityArrays = [...html.matchAll(/equity:\[([0-9,-]+)\]/g)];

    // Total is the last array (largest values = summary row)
    if (assetsArrays.length > 0) {
      const lastAssets = assetsArrays[assetsArrays.length - 1]!;
      const firstVal = lastAssets[1]!.split(",")[0];
      if (firstVal) {
        details.totalAssets = formatLargeNumber(parseInt(firstVal, 10));
      }
    }

    if (liabArrays.length > 0) {
      const lastLiab = liabArrays[liabArrays.length - 1]!;
      const firstVal = lastLiab[1]!.split(",")[0];
      if (firstVal) {
        details.totalLiabilities = formatLargeNumber(parseInt(firstVal, 10));
      }
    }

    // For equity, the first array is shareholders' equity, last is total (which equals total assets)
    // So we want the first equity array
    if (equityArrays.length > 0) {
      const firstEquity = equityArrays[0]!;
      const firstVal = firstEquity[1]!.split(",")[0];
      if (firstVal) {
        details.totalEquity = formatLargeNumber(parseInt(firstVal, 10));
      }
    }

    return details;
  } catch (e) {
    if ((e as Error).name === "AbortError") throw e;
    return {};
  }
}

async function fetchEarningsGrowth(symbol: string, signal?: AbortSignal): Promise<Partial<FinancialDetails>> {
  const url = `https://stockanalysis.com/stocks/${encodeURIComponent(symbol.toLowerCase())}/financials/?p=quarterly`;
  try {
    const response = await fetch(url, {
      headers: { "User-Agent": USER_AGENT },
      signal,
    });
    if (!response.ok) return {};
    const html = await response.text();

    // Extract datekey array to find which indices are Y/Y comparable
    const dateMatch = html.match(/datekey:\[([^\]]+)\]/);
    if (!dateMatch) return {};
    const dates = dateMatch[1]!.match(/"([^"]+)"/g)?.map((d) => d.replace(/"/g, ""));
    if (!dates || dates.length < 5) return {};

    // Find the index 4 quarters back (same quarter prior year)
    // datekey[0] = most recent, datekey[4] = same quarter last year
    const mostRecentDate = dates[0]!;
    const mostRecentYear = parseInt(mostRecentDate.split("-")[0]!, 10);
    const mostRecentQtr = mostRecentDate.slice(5); // "MM-DD"

    let yoyIndex = -1;
    for (let i = 1; i < dates.length; i++) {
      const d = dates[i]!;
      const year = parseInt(d.split("-")[0]!, 10);
      const qtr = d.slice(5);
      if (year === mostRecentYear - 1 && qtr === mostRecentQtr) {
        yoyIndex = i;
        break;
      }
    }
    if (yoyIndex === -1) return {};

    // Get net income array — last occurrence is total net income
    const netIncomeArrays = [...html.matchAll(/netIncome:\[([0-9,.-]+)\]/g)];
    if (netIncomeArrays.length === 0) return {};

    const lastArray = netIncomeArrays[netIncomeArrays.length - 1]!;
    const values = lastArray[1]!.split(",").map((v) => parseInt(v, 10));

    const current = values[0];
    const prior = values[yoyIndex];
    if (current === undefined || prior === undefined || prior === 0) return {};

    const growth = (current - prior) / Math.abs(prior);
    return { earningsGrowthYoY: growth };
  } catch (e) {
    if ((e as Error).name === "AbortError") throw e;
    return {};
  }
}

export async function fetchFinancialDetails(symbol: string, signal?: AbortSignal): Promise<FinancialDetails | null> {
  try {
    const [stats, balanceSheet, earnings] = await Promise.all([
      fetchStatistics(symbol, signal),
      fetchBalanceSheet(symbol, signal),
      fetchEarningsGrowth(symbol, signal),
    ]);

    const details: FinancialDetails = {
      ...stats,
      ...balanceSheet,
      ...earnings,
    };

    // Return null if we got nothing
    if (Object.keys(details).length === 0) return null;

    return details;
  } catch (e) {
    if ((e as Error).name === "AbortError") throw e;
    return null;
  }
}
