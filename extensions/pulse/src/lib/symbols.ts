// What a search result points at, and how each source spells it.

export type Market = "us" | "hk" | "sh" | "sz" | "jp" | "kr" | "kq" | "tw" | "two" | "index" | "crypto";
export type Language = "en" | "zh-Hans" | "zh-Hant" | "ja" | "ko";
export type Kind = "equity" | "etf" | "index" | "crypto";

export interface Instrument {
  /** Unique across sources: the Yahoo ticker (`0700.HK`, `^GSPC`) or the Binance pair (`BTC/USDT`). */
  symbol: string;
  market: Market;
  kind: Kind;
  /** The name shown, in the reader's language where the catalog has one. */
  name: string;
  exchange: string | null;
}

export const MARKET_LABELS: Record<Market, string> = {
  us: "US",
  hk: "Hong Kong",
  sh: "Shanghai",
  sz: "Shenzhen",
  jp: "Tokyo",
  kr: "KOSPI",
  kq: "KOSDAQ",
  tw: "Taiwan",
  two: "TPEx",
  index: "Index",
  crypto: "Crypto",
};

/** The currency a market trades in, for list rows whose source leaves it out. */
export const MARKET_CURRENCIES: Partial<Record<Market, string>> = {
  us: "USD",
  hk: "HKD",
  sh: "CNY",
  sz: "CNY",
  jp: "JPY",
  kr: "KRW",
  kq: "KRW",
  tw: "TWD",
  two: "TWD",
};

/** The search bar's market filter: a family of boards counts as one market. */
export const MARKET_FILTERS: { value: string; title: string; markets: Market[] }[] = [
  { value: "all", title: "All Markets", markets: [] },
  { value: "us", title: "United States", markets: ["us"] },
  { value: "hk", title: "Hong Kong", markets: ["hk"] },
  { value: "cn", title: "China A-Shares", markets: ["sh", "sz"] },
  { value: "jp", title: "Japan", markets: ["jp"] },
  { value: "kr", title: "Korea", markets: ["kr", "kq"] },
  { value: "tw", title: "Taiwan", markets: ["tw", "two"] },
  { value: "index", title: "Indices", markets: ["index"] },
  { value: "crypto", title: "Crypto", markets: ["crypto"] },
];

/** The ticker Yahoo Finance prices a catalog listing under. */
export function yahooSymbol(market: Market, code: string): string {
  switch (market) {
    case "hk":
      return code.padStart(4, "0") + ".HK";
    case "sh":
      return code + ".SS";
    case "sz":
      return code + ".SZ";
    case "jp":
      return code + ".T";
    // The board is part of the address: 035720 is KOSPI, its neighbours may not be.
    case "kr":
      return code + ".KS";
    case "kq":
      return code + ".KQ";
    // Likewise in Taiwan: 6488 trades on TPEx, and `6488.TW` does not price it.
    case "tw":
      return code + ".TW";
    case "two":
      return code + ".TWO";
    default:
      return code;
  }
}

export function isCryptoPair(symbol: string): boolean {
  return /^[A-Z0-9]{1,20}\/[A-Z0-9]{1,20}$/.test(symbol);
}

/**
 * A ticker typed by hand, as Yahoo spells it, or null when it cannot be one.
 * `600519.SH` becomes `600519.SS` and `700.HK` becomes `0700.HK`.
 */
export function normalizeTypedSymbol(input: string): string | null {
  let symbol = input.trim().toUpperCase();
  if (isCryptoPair(symbol)) return symbol;
  if (!/^[A-Z0-9^][A-Z0-9.^=-]{0,31}$/.test(symbol)) return null;
  if (/^\d{6}\.SH$/.test(symbol)) symbol = symbol.replace(/\.SH$/, ".SS");
  const hk = /^(\d{1,5})\.HK$/.exec(symbol);
  if (hk) symbol = String(Number(hk[1])).padStart(4, "0") + ".HK";
  return symbol;
}

/** Pulse's own index list, named in every language Pulse speaks. */
export const INDICES: { symbol: string; codes: string[]; names: Record<Language, string> }[] = [
  {
    symbol: "^GSPC",
    codes: ["SPX", "GSPC", "SP500"],
    names: { en: "S&P 500", "zh-Hans": "标普500指数", "zh-Hant": "標普500指數", ja: "S&P 500", ko: "S&P 500" },
  },
  {
    symbol: "^IXIC",
    codes: ["IXIC", "COMP"],
    names: {
      en: "Nasdaq Composite",
      "zh-Hans": "纳斯达克综合指数",
      "zh-Hant": "那斯達克綜合指數",
      ja: "ナスダック総合指数",
      ko: "나스닥 종합지수",
    },
  },
  {
    symbol: "^DJI",
    codes: ["DJI", "DJIA", "DOW"],
    names: {
      en: "Dow Jones Industrial Average",
      "zh-Hans": "道琼斯工业平均指数",
      "zh-Hant": "道瓊工業平均指數",
      ja: "ダウ平均",
      ko: "다우존스 산업평균지수",
    },
  },
  {
    symbol: "^NDX",
    codes: ["NDX", "NASDAQ100"],
    names: {
      en: "Nasdaq 100",
      "zh-Hans": "纳斯达克100指数",
      "zh-Hant": "那斯達克100指數",
      ja: "ナスダック100",
      ko: "나스닥 100",
    },
  },
  {
    symbol: "^VIX",
    codes: ["VIX"],
    names: {
      en: "CBOE Volatility Index",
      "zh-Hans": "CBOE波动率指数",
      "zh-Hant": "CBOE波動率指數",
      ja: "VIX指数",
      ko: "VIX 변동성지수",
    },
  },
  {
    symbol: "^RUI",
    codes: ["RUI"],
    names: {
      en: "Russell 1000",
      "zh-Hans": "罗素1000指数",
      "zh-Hant": "羅素1000指數",
      ja: "ラッセル1000",
      ko: "러셀 1000",
    },
  },
  {
    symbol: "^RUT",
    codes: ["RUT"],
    names: {
      en: "Russell 2000",
      "zh-Hans": "罗素2000指数",
      "zh-Hant": "羅素2000指數",
      ja: "ラッセル2000",
      ko: "러셀 2000",
    },
  },
  {
    symbol: "^HSI",
    codes: ["HSI"],
    names: { en: "Hang Seng Index", "zh-Hans": "恒生指数", "zh-Hant": "恒生指數", ja: "ハンセン指数", ko: "항셍지수" },
  },
  {
    symbol: "^HSTECH",
    codes: ["HSTECH"],
    names: {
      en: "Hang Seng TECH Index",
      "zh-Hans": "恒生科技指数",
      "zh-Hant": "恒生科技指數",
      ja: "ハンセンテック指数",
      ko: "항셍테크지수",
    },
  },
  {
    symbol: "000001.SS",
    codes: ["SSEC", "000001.SS"],
    names: {
      en: "Shanghai Composite",
      "zh-Hans": "上证指数",
      "zh-Hant": "上證指數",
      ja: "上海総合指数",
      ko: "상하이종합지수",
    },
  },
  {
    symbol: "399001.SZ",
    codes: ["399001", "SZI"],
    names: {
      en: "Shenzhen Component Index",
      "zh-Hans": "深证成指",
      "zh-Hant": "深證成指",
      ja: "深セン成分指数",
      ko: "선전성분지수",
    },
  },
  {
    symbol: "399006.SZ",
    codes: ["399006", "CHINEXT"],
    names: {
      en: "ChiNext Index",
      "zh-Hans": "创业板指",
      "zh-Hant": "創業板指",
      ja: "創業板指数",
      ko: "차이넥스트지수",
    },
  },
  {
    symbol: "^N225",
    codes: ["N225", "NIKKEI"],
    names: {
      en: "Nikkei 225",
      "zh-Hans": "日经225指数",
      "zh-Hant": "日經225指數",
      ja: "日経平均株価",
      ko: "닛케이 225",
    },
  },
  {
    symbol: "^KS11",
    codes: ["KS11", "KOSPI"],
    names: {
      en: "KOSPI Composite Index",
      "zh-Hans": "韩国综合指数",
      "zh-Hant": "韓國綜合指數",
      ja: "韓国総合株価指数",
      ko: "코스피",
    },
  },
  {
    symbol: "^TWII",
    codes: ["TWII", "TAIEX"],
    names: {
      en: "TAIEX",
      "zh-Hans": "台湾加权指数",
      "zh-Hant": "台灣加權指數",
      ja: "台湾加権指数",
      ko: "대만 가권지수",
    },
  },
  {
    symbol: "^TWOII",
    codes: ["TWOII", "TPEX"],
    names: {
      en: "TPEx Index",
      "zh-Hans": "台湾柜买指数",
      "zh-Hant": "櫃買指數",
      ja: "台湾店頭指数",
      ko: "대만 장외지수",
    },
  },
];

/** Where a person goes to read more about the instrument. */
export function quotePageUrl(symbol: string): string {
  if (isCryptoPair(symbol)) return `https://www.binance.com/en/trade/${symbol.replace("/", "_")}?type=spot`;
  return `https://finance.yahoo.com/quote/${encodeURIComponent(symbol)}`;
}

// The one Pulse link, tagged with where the click came from.
export const PULSE_FOR_MAC_URL =
  "https://www.pulseticker.app/?utm_source=raycast&utm_medium=extension&utm_content=action";
