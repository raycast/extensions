export const CACHE_TTL = 60 * 60 * 1000; // 1 hour

export const STEAM_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  Accept: "text/html",
  Referer: "https://store.steampowered.com/",
  Cookie:
    "birthtime=631152001; lastagecheckage=1-January-1990; mature_content=1; wants_mature_content=1",
};

export const CURRENCY_SYMBOLS: Record<string, string> = {
  de: "€",
  fr: "€",
  nl: "€",
  pl: "zł",
  cz: "Kč",
  se: "kr",
  no: "kr",
  us: "$",
  gb: "£",
  au: "A$",
  ca: "C$",
  br: "R$",
  tr: "₺",
  ru: "₽",
};
