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

export function buildBundleMap(oJson: any): Record<string, number> {
  const bundleCounts: Record<string, number> = {};
  const now = Date.now();

  const overviewArray = Array.isArray(oJson)
    ? oJson
    : Object.values(oJson || {}).flatMap((v: any) =>
        Array.isArray(v) ? v : [v],
      );

  overviewArray.forEach((item: any) => {
    const expiryTime = item.expiry ? new Date(item.expiry).getTime() : NaN;
    const isNotExpired =
      !item.expiry || Number.isNaN(expiryTime) || expiryTime > now;

    if (Array.isArray(item.tiers) && isNotExpired) {
      item.tiers.forEach((t: any) => {
        t.games?.forEach((gm: any) => {
          if (gm.id != null) {
            const id = String(gm.id);
            bundleCounts[id] = (bundleCounts[id] || 0) + 1;
          }
        });
      });
    }
  });

  return bundleCounts;
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

export function getTimeContext(timestamp: number): string {
  const days = Math.floor((Date.now() - timestamp) / (1000 * 60 * 60 * 24));
  if (days === 0) return "today";
  if (days < 30) return `${days} days ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} months ago`;
  return `${(days / 365).toFixed(1)} years ago`;
}
