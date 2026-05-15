import { Icon, Color } from "@raycast/api";
import type { BundleValue, Deal } from "./types";

export const STORE_MAP: Record<string, string[]> = {
  steam: ["Steam"],
  epic: ["Epic Games Store"],
  gog: ["GOG"],
  humble: ["Humble Store", "Humble Widget"],
  fanatical: ["Fanatical"],
  gmg: ["Green Man Gaming"],
  ea: ["Origin", "EA App", "EA Store"],
  ubisoft: ["Ubisoft Store", "Uplay"],
  blizzard: ["Blizzard Shop", "Battle.net"],
  microsoft: ["Microsoft Store", "Xbox Store"],
  gamersgate: ["GamersGate"],
  indiegala: ["IndieGala Store", "IndieGala"],
  dlgamer: ["DLGamer"],
  gamebillet: ["GameBillet"],
  voidu: ["Voidu"],
  gamesplanet: [
    "GamesPlanet US",
    "GamesPlanet UK",
    "GamesPlanet FR",
    "GamesPlanet DE",
  ],
  wingamestore: ["WinGameStore", "MacGameStore"],
  "2game": ["2Game"],
  allyouplay: ["AllYouPlay"],
  etailmarket: ["eTail.Market"],
  joybuggy: ["JoyBuggy"],
  planetplay: ["PlanetPlay"],
  other: [],
};

export const STORE_LOOKUP: Record<string, string> = {};
for (const [id, names] of Object.entries(STORE_MAP)) {
  names.forEach((name) => {
    STORE_LOOKUP[name] = id;
  });
}

export function formatPrice(
  amount: number | undefined,
  currency: string | undefined,
): string {
  if (amount === undefined || amount === null) return "-";
  if (amount === 0) return "FREE";
  const symbols: Record<string, string> = {
    USD: "$",
    GBP: "£",
    EUR: "€",
    TRY: "₺",
    JPY: "¥",
    CNY: "¥",
    KRW: "₩",
    INR: "₹",
    RUB: "₽",
    BRL: "R$",
    CAD: "CA$",
    AUD: "A$",
    NZD: "NZ$",
    HKD: "HK$",
    SGD: "S$",
    MXN: "MX$",
    NOK: "kr",
    SEK: "kr",
    DKK: "kr",
    PLN: "zł",
    CZK: "Kč",
    HUF: "Ft",
    CHF: "CHF",
    ZAR: "R",
    SAR: "﷼",
    AED: "د.إ",
    QAR: "﷼",
    THB: "฿",
    IDR: "Rp",
    MYR: "RM",
    PHP: "₱",
    TWD: "NT$",
    ARS: "ARS$",
    CLP: "CLP$",
    COP: "COP$",
    UYU: "UYU$",
    KZT: "₸",
    ILS: "₪",
    UAH: "₴",
  };
  const curr = currency || "USD";
  const symbol = symbols[curr] || curr + " ";
  const noDecimals = ["JPY", "KRW"];
  return `${symbol}${noDecimals.includes(curr) ? Math.round(amount) : amount.toFixed(2)}`;
}

export function isStoreAllowed(
  shopName: string,
  selectedStores: string[],
): boolean {
  if (
    selectedStores.length === 0 ||
    (selectedStores.length === 1 && selectedStores[0] === "all")
  )
    return true;
  return selectedStores.includes(STORE_LOOKUP[shopName] || "other");
}

export function computeGameInsight(params: {
  currentPrice: number | null;
  statsPrices: number[];
  allTimeLow: number | null;
  currentBest: Deal | null | undefined;
  bundleValue: BundleValue | null;
  dataMonths: number;
  range: "1y" | "6m" | "3m";
  isLoading: boolean;
}) {
  const {
    currentPrice,
    statsPrices,
    allTimeLow,
    currentBest,
    bundleValue,
    range,
    isLoading,
  } = params;

  // Defaults
  let signalText = "";
  let signalIcon: Icon | string = Icon.Circle;
  let signalColor: Color = Color.SecondaryText;
  let primaryInsight = "";
  let secondaryInsight = "";
  let medianSale: number | null = null;
  let isAlwaysFullPrice = false;
  let overrideSignal: string | null = null;
  let rank: number | null = null;
  let percentile = 0;

  if (!isLoading && currentPrice != null && statsPrices.length > 0) {
    // FREE override
    if (currentPrice === 0 || currentBest?.cut === 100) {
      overrideSignal = currentBest?.cut === 100 ? "free_claim" : "free_play";
    }

    // bundle cheaper override
    if (!overrideSignal && bundleValue?.type === "better") {
      overrideSignal = "bundle_cheaper";
    }

    // median & isAlwaysFullPrice
    if (statsPrices.length > 0) {
      const sorted = [...statsPrices].sort((a, b) => a - b);
      const maxPrice = sorted[sorted.length - 1];
      const salePrices = sorted.filter(
        (p) => (maxPrice - p) / maxPrice > 0.005,
      );
      if (salePrices.length > 0) {
        const mid = Math.floor(salePrices.length / 2);
        medianSale =
          salePrices.length % 2 !== 0
            ? salePrices[mid]
            : (salePrices[mid - 1] + salePrices[mid]) / 2;
      } else {
        medianSale = maxPrice;
        isAlwaysFullPrice = true;
      }
    }

    // percentile
    const sorted = [...statsPrices].sort((a, b) => a - b);
    const index = sorted.findIndex((p) => p >= currentPrice);
    percentile = index === -1 ? 1 : index / sorted.length;

    if (overrideSignal === "free_claim") {
      signalText = "Free to Claim";
      signalIcon = Icon.Gift;
      signalColor = Color.Blue;
      primaryInsight = "100% off right now";
    } else if (overrideSignal === "free_play") {
      signalText = "Free to Play";
      signalIcon = Icon.GameController;
      signalColor = Color.Blue;
      primaryInsight = "Always free to play";
    } else if (overrideSignal === "bundle_cheaper") {
      signalText = "Cheaper in Bundle";
      signalIcon = Icon.Box;
      signalColor = Color.Purple;
      primaryInsight = "Cheaper in an active bundle";
    } else if (isAlwaysFullPrice) {
      rank = -1;
      if (
        allTimeLow != null &&
        currentPrice != null &&
        allTimeLow < currentPrice
      ) {
        signalText = "No recent discounts";
        signalIcon = Icon.Clock;
        signalColor = Color.Orange;
        primaryInsight = "No discounts in past year";
      } else {
        signalText = "Never on Sale";
        signalIcon = Icon.Clock;
        signalColor = Color.SecondaryText;
        primaryInsight = "Never discounted";
      }
    } else {
      // rank from percentile
      if (percentile <= 0.15) {
        rank = 4;
      } else if (percentile <= 0.3) {
        rank = 3;
      } else if (percentile <= 0.55) {
        rank = 2;
      } else if (percentile <= 0.8) {
        rank = 1;
      } else {
        rank = 0;
      }

      // bundle value downgrade
      if (bundleValue?.type === "value") {
        rank = Math.min(rank, 1);
      }

      // ATL distance penalty
      if (
        allTimeLow != null &&
        currentPrice != null &&
        rank != null &&
        rank > 0
      ) {
        const ratio = currentPrice / allTimeLow;
        if (ratio >= 1.5) {
          rank = Math.max(0, rank - 2);
        } else if (ratio >= 1.3) {
          rank = Math.max(0, rank - 1);
        }
      }

      // ATL boost
      if (
        allTimeLow != null &&
        currentPrice != null &&
        rank != null &&
        allTimeLow > 0
      ) {
        const atlDiff = ((currentPrice - allTimeLow) / allTimeLow) * 100;
        if (atlDiff < -1) {
          rank = Math.max(rank, 4);
        } else if (atlDiff < 1) {
          rank = Math.max(rank, 3);
        }
      }

      // map rank to signal
      if (rank === 4) {
        signalText = "Strong Opportunity";
        signalIcon = Icon.ThumbsUp;
        signalColor = Color.Green;
      } else if (rank === 3) {
        signalText = "Good Opportunity";
        signalIcon = Icon.CheckCircle;
        signalColor = Color.Green;
      } else if (rank === 2) {
        signalText = "Average Timing";
        signalIcon =
          'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><path d="M 3 8 Q 5.5 4, 8 8 T 13 8" stroke="black" stroke-width="2" stroke-linecap="round" fill="none"/></svg>';
        signalColor = Color.Yellow;
      } else if (rank === 1) {
        signalText = "Weak Opportunity";
        signalIcon = Icon.ExclamationMark;
        signalColor = Color.Orange;
      } else if (rank === 0) {
        signalText = "Poor Opportunity";
        signalIcon = Icon.XMarkCircle;
        signalColor = Color.Red;
      }
    }
    signalText = signalText.toUpperCase();
  } else if (!isLoading && currentPrice != null && statsPrices.length === 0) {
    signalText = "INSUFFICIENT DATA";
    signalIcon = Icon.QuestionMark;
    signalColor = Color.SecondaryText;
    primaryInsight = "No price history for past year";
  }

  // Insights logic
  if (!primaryInsight) {
    const bundleText =
      bundleValue?.type === "value" ? "Better value in bundle" : "";
    const signalIsPositive = rank !== null && rank >= 3;

    let priceText = "";
    if (statsPrices.length > 0 && currentPrice != null) {
      const minPrice = Math.min(...statsPrices);
      const maxPrice = Math.max(...statsPrices);
      const uniquePrices = new Set(statsPrices);
      const spread = (maxPrice - minPrice) / minPrice;

      const periodLabel =
        range === "1y"
          ? "past year"
          : range === "6m"
            ? "past 6 months"
            : "past 3 months";

      if (uniquePrices.size === 1 || spread <= 0.005) {
        priceText = "";
      } else if (currentPrice >= maxPrice * 0.99) {
        priceText = `Highest in ${periodLabel}`;
      } else if (currentPrice <= minPrice * 1.005) {
        priceText = `Lowest in ${periodLabel}`;
      } else if (percentile >= 0.9) {
        priceText = `Near highest in ${periodLabel}`;
      } else if (percentile <= 0.1) {
        priceText = `Near lowest in ${periodLabel}`;
      } else {
        priceText = "";
      }
    }

    let atlText = "";
    if (allTimeLow != null && currentPrice != null) {
      if (allTimeLow === 0 && currentPrice > 0) {
        atlText = "Previously free";
      } else {
        const diff = ((currentPrice - allTimeLow) / allTimeLow) * 100;
        const rounded = Math.round(diff);
        if (Math.abs(diff) < 1) {
          atlText = "All-time low";
        } else if (diff < -1) {
          atlText = "New all-time low (record low)";
        } else {
          atlText = `${rounded > 0 ? "~" : ""}${rounded}% above all-time low`;
        }
      }
    }

    if (bundleText) {
      primaryInsight = bundleText;
    } else if (atlText && priceText) {
      if (
        (atlText === "All-time low" || atlText === "New all-time low") &&
        priceText.startsWith("Lowest")
      ) {
        primaryInsight = atlText;
      } else if (signalIsPositive) {
        primaryInsight = priceText;
        secondaryInsight = atlText;
      } else {
        const atlIsGood =
          atlText.includes("low") || atlText.includes("New all-time");
        const priceIsGood =
          priceText.includes("low") || priceText.includes("Low");
        if ((atlIsGood && priceIsGood) || (!atlIsGood && !priceIsGood)) {
          primaryInsight = atlText;
          secondaryInsight = priceText;
        } else {
          primaryInsight = atlIsGood ? atlText : priceText;
          secondaryInsight = atlIsGood ? priceText : atlText;
        }
      }
    } else if (atlText) {
      primaryInsight = atlText;
    } else if (priceText) {
      primaryInsight = priceText;
    }
  }

  const classifyInsight = (text: string): string => {
    if (!text) return "neutral";
    const lower = text.toLowerCase();

    if (lower.includes("bundle")) return "negative";

    if (lower.includes("100% off") || lower.includes("free")) return "positive";

    if (lower.includes("no discount") || lower.includes("never discounted"))
      return "negative";

    const atlAboveMatch = lower.match(/([\d.]+)% above all[-‑]time low/);
    if (atlAboveMatch) {
      const pct = parseFloat(atlAboveMatch[1]);
      if (pct < 1) return "positive";
      if (pct >= 30) return "negative";
      return "neutral";
    }

    if (lower.includes("all-time low") || lower.includes("new all-time low"))
      return "positive";
    if (lower.includes("lowest") || lower.includes("low")) return "positive";
    if (
      lower.includes("highest") ||
      lower.includes("high") ||
      lower.includes("above")
    )
      return "negative";

    return "neutral";
  };

  const primaryClass = classifyInsight(primaryInsight);
  const secondaryClass = secondaryInsight
    ? classifyInsight(secondaryInsight)
    : "neutral";

  return {
    signalText,
    signalIcon,
    signalColor,
    primaryInsight,
    secondaryInsight,
    medianSale,
    rank,
    percentile,
    primaryIsPositive: primaryClass === "positive",
    primaryIsNeutral: primaryClass === "neutral",
    secondaryIsPositive: secondaryClass === "positive",
    secondaryIsNeutral: secondaryClass === "neutral",
  };
}
