// On-device search over Pulse's symbol catalog, ported from the Mac app's
// SymbolSearchIndex: every spelling of every listing is folded once, and a
// query ranks exact over prefix over substring matches, then by popularity.
import * as OpenCC from "opencc-js/t2cn";
import { INDICES, Instrument, Kind, Language, Market, yahooSymbol } from "./symbols";

/** The catalog file as pulse-server publishes it (schema 1). */
export interface CatalogDocument {
  schema: number;
  generatedAt: string;
  markets: string[];
  securities: { m: string; c: string; t?: string; n: Record<string, string>; a?: string[]; p?: number; x?: string }[];
  crypto?: { b: string; n?: Record<string, string>; a?: string[]; p?: number }[];
}

/** Binance Spot pairs that are trading, as [base, quote]. */
export type CryptoPairs = [string, string][];

const SECURITY_MARKETS = new Set<Market>(["us", "hk", "sh", "sz", "jp", "kr", "kq", "tw", "two"]);
const LANGUAGES: Language[] = ["en", "zh-Hans", "zh-Hant", "ja", "ko"];
const LISTING_LANGUAGE: Partial<Record<Market, Language>> = {
  us: "en",
  hk: "zh-Hant",
  tw: "zh-Hant",
  two: "zh-Hant",
  sh: "zh-Hans",
  sz: "zh-Hans",
  jp: "ja",
  kr: "ko",
  kq: "ko",
};
// A coin leads with its best-quoted pair.
const QUOTE_PRIORITY = ["USDT", "USDC", "FDUSD", "USD", "BTC", "ETH"];

const toSimplified = OpenCC.Converter({ from: "tw", to: "cn" });
const HAN = /\p{Script=Han}/u;
const KANA = /[\p{Script=Hiragana}\p{Script=Katakana}]/u;
const HANGUL = /\p{Script=Hangul}/u;

/**
 * Case, width, Latin accents, Traditional script, spaces and punctuation fold
 * away: `ＡＡＰＬ`, `Nestlé`, `台積電` and `BRK.B` become `aapl`, `nestle`,
 * `台积电` and `brkb`. Kana and Hangul stay as typed: their marks change the word.
 */
export function fold(raw: string): string {
  const compatible = raw.normalize("NFKC").toLowerCase();
  const unaccented = compatible.normalize("NFD").replace(/[̀-ͯ]/g, "").normalize("NFC");
  const simplified = HAN.test(unaccented) ? toSimplified(unaccented) : unaccented;
  return simplified.replace(/[^\p{L}\p{M}\p{N}]/gu, "");
}

enum Match {
  ExactCode,
  ExactName,
  ExactAlias,
  CodePrefix,
  NamePrefix,
  AliasPrefix,
  NameSubstring,
}

const tier = (match: Match) => (match <= Match.ExactAlias ? 0 : match <= Match.AliasPrefix ? 1 : 2);

interface Candidate {
  symbol: string;
  market: Market;
  kind: Kind;
  exchange: string | null;
  names: Partial<Record<Language, string>>;
  popularity: number;
  codes: string[];
  nameKeys: string[];
  aliasKeys: string[];
  /** Crypto only: the coin's other pairs, best quote first, after the lead one. */
  otherPairs: string[];
}

export interface Hit {
  instrument: Instrument;
  match: number;
  score: number;
}

/** The reader's language: an explicit choice, else the script they typed, else the system's. */
export function readerLanguage(preference: string, query: string, systemLocale: string): Language {
  if ((LANGUAGES as string[]).includes(preference)) return preference as Language;
  if (KANA.test(query)) return "ja";
  if (HANGUL.test(query)) return "ko";
  if (HAN.test(query)) return toSimplified(query) === query ? "zh-Hans" : "zh-Hant";
  const locale = systemLocale.toLowerCase();
  if (/^zh[-_](hant|tw|hk|mo)/.test(locale)) return "zh-Hant";
  if (locale.startsWith("zh")) return "zh-Hans";
  if (locale.startsWith("ja")) return "ja";
  if (locale.startsWith("ko")) return "ko";
  return "en";
}

/**
 * The name for a reader of `language`, falling back through the scripts they
 * can still read, then English, then the name the exchange itself gives.
 */
export function displayName(
  names: Partial<Record<Language, string>>,
  language: Language,
  market: Market,
): string | null {
  const order: Language[] = {
    en: ["en"],
    "zh-Hans": ["zh-Hans", "zh-Hant", "en"],
    "zh-Hant": ["zh-Hant", "zh-Hans", "en"],
    ja: ["ja", "en", "zh-Hant", "zh-Hans"],
    ko: ["ko", "en", "zh-Hant", "zh-Hans"],
  }[language] as Language[];
  const native = LISTING_LANGUAGE[market];
  if (native) order.push(native);
  for (const locale of order) {
    const name = names[locale]?.trim();
    if (!name) continue;
    // Taiwan's exchanges write Traditional only; a Simplified reader gets it in their script.
    return language === "zh-Hans" && locale === "zh-Hant" ? toSimplified(name) : name;
  }
  return Object.values(names).find((name) => name && name.trim()) ?? null;
}

function unique(keys: string[]): string[] {
  return [...new Set(keys.filter((key) => key.length > 0))];
}

/** Every way a code is written: bare, zero-padded, and with the suffix a chart site would add. */
function codeSpellings(market: Market, code: string): string[] {
  const codes = [code, yahooSymbol(market, code)];
  if (market === "hk") codes.push(code.padStart(4, "0"), code.padStart(5, "0"), code.padStart(5, "0") + ".HK");
  if (market === "sh") codes.push("SH" + code, code + ".SH");
  if (market === "sz") codes.push("SZ" + code);
  return unique(codes.map(fold));
}

function nameKeys(names: Record<string, string> | undefined): string[] {
  return unique(Object.values(names ?? {}).map(fold));
}

function pickNames(names: Record<string, string> | undefined): Partial<Record<Language, string>> {
  const picked: Partial<Record<Language, string>> = {};
  for (const language of LANGUAGES) {
    const name = names?.[language];
    if (typeof name === "string" && name.trim()) picked[language] = name;
  }
  return picked;
}

export class SymbolIndex {
  private readonly candidates: Candidate[] = [];
  readonly pairs: Set<string>;

  constructor(document: CatalogDocument | null, pairs: CryptoPairs | null) {
    const seen = new Set<string>();

    // Pulse names its own indices; they lead the way they lead its watchlist.
    for (const index of INDICES) {
      seen.add(index.symbol);
      this.candidates.push({
        symbol: index.symbol,
        market: "index",
        kind: "index",
        exchange: null,
        names: index.names,
        popularity: 0.95,
        codes: unique([index.symbol, ...index.codes].map(fold)),
        nameKeys: nameKeys(index.names),
        aliasKeys: [],
        otherPairs: [],
      });
    }

    for (const entry of document?.securities ?? []) {
      const market = entry.m as Market;
      if (!SECURITY_MARKETS.has(market) || typeof entry.c !== "string" || !entry.c) continue;
      const symbol = yahooSymbol(market, entry.c);
      if (seen.has(symbol)) continue;
      seen.add(symbol);
      this.candidates.push({
        symbol,
        market,
        kind: entry.t === "etf" ? "etf" : "equity",
        exchange: typeof entry.x === "string" ? entry.x : null,
        names: pickNames(entry.n),
        popularity: Math.min(Math.max(entry.p ?? 0, 0), 1),
        codes: codeSpellings(market, entry.c),
        nameKeys: nameKeys(entry.n),
        aliasKeys: unique((entry.a ?? []).map(fold)),
        otherPairs: [],
      });
    }

    // Coins come from Binance's own directory when we have it; the catalog only names them.
    const quotesByBase = new Map<string, string[]>();
    for (const [base, quote] of pairs ?? []) {
      const quotes = quotesByBase.get(base) ?? [];
      quotes.push(quote);
      quotesByBase.set(base, quotes);
    }
    this.pairs = new Set((pairs ?? []).map(([base, quote]) => `${base}/${quote}`));
    const rank = (quote: string) => {
      const index = QUOTE_PRIORITY.indexOf(quote);
      return index < 0 ? QUOTE_PRIORITY.length : index;
    };
    for (const coin of document?.crypto ?? []) {
      if (typeof coin.b !== "string" || !coin.b) continue;
      const base = coin.b.toUpperCase();
      // Without the directory, assume the USDT pair: nearly every listed coin has one.
      const quotes = (quotesByBase.get(base) ?? (pairs ? [] : ["USDT"])).sort(
        (a, b) => rank(a) - rank(b) || a.localeCompare(b),
      );
      if (quotes.length === 0) continue;
      const symbols = quotes.map((quote) => `${base}/${quote}`);
      this.candidates.push({
        symbol: symbols[0],
        market: "crypto",
        kind: "crypto",
        exchange: "Binance Spot",
        names: pickNames(coin.n),
        popularity: Math.min(Math.max(coin.p ?? 0.1, 0), 1),
        codes: unique([base, base + quotes[0]].map(fold)),
        nameKeys: nameKeys(coin.n),
        aliasKeys: unique((coin.a ?? []).map(fold)),
        otherPairs: symbols.slice(1, 7),
      });
    }
  }

  get size(): number {
    return this.candidates.length;
  }

  search(rawQuery: string, options: { limit?: number; markets?: Market[]; language: Language }): Hit[] {
    const query = fold(rawQuery);
    const limit = options.limit ?? 30;
    if (!query) return [];
    const markets = options.markets?.length ? new Set(options.markets) : null;
    // A Latin fragment under three letters is inside half the names in the catalog; one Han character is a word.
    const ascii = /^[\x20-\x7e]*$/.test(query);
    const substrings = ascii ? query.length >= 3 : true;

    const hits: Hit[] = [];
    for (const candidate of this.candidates) {
      if (markets && !markets.has(candidate.market)) continue;
      let best: Match | null = null;
      let closeness = 0;
      const consider = (keys: string[], exact: Match, prefix: Match, substring: Match | null) => {
        for (const key of keys) {
          let found: Match | null = null;
          if (key === query) found = exact;
          else if (key.startsWith(query)) found = prefix;
          else if (substring !== null && substrings && key.includes(query)) found = substring;
          if (found === null) continue;
          const keyCloseness = query.length / Math.max(key.length, 1);
          if (best === null || found < best || (found === best && keyCloseness > closeness)) {
            best = found;
            closeness = keyCloseness;
          }
        }
      };
      consider(candidate.codes, Match.ExactCode, Match.CodePrefix, null);
      consider(candidate.nameKeys, Match.ExactName, Match.NamePrefix, Match.NameSubstring);
      consider(candidate.aliasKeys, Match.ExactAlias, Match.AliasPrefix, Match.NameSubstring);
      if (best === null) continue;
      const score = 25 * candidate.popularity + 6 * Math.min(closeness, 1);
      hits.push({ instrument: this.instrument(candidate, candidate.symbol, options.language), match: best, score });
      // Asked for by exactly its code, a coin's other pairs stay reachable behind everything else.
      if (best === Match.ExactCode && candidate.otherPairs.length) {
        candidate.otherPairs.forEach((symbol, offset) =>
          hits.push({
            instrument: this.instrument(candidate, symbol, options.language),
            match: Match.NameSubstring,
            score: -10 - offset,
          }),
        );
      }
    }
    // Tier first, then score; equal scores keep catalog order (most valuable first).
    return hits
      .map((hit, order) => ({ hit, order }))
      .sort(
        (a, b) =>
          tier(a.hit.match) - tier(b.hit.match) ||
          b.hit.score - a.hit.score ||
          a.hit.match - b.hit.match ||
          a.order - b.order,
      )
      .slice(0, limit)
      .map(({ hit }) => hit);
  }

  /** The most valuable listings of some markets, for browsing before typing. */
  top(markets: Market[], limit: number, language: Language): Instrument[] {
    return this.candidates
      .filter((candidate) => markets.includes(candidate.market))
      .sort((a, b) => b.popularity - a.popularity)
      .slice(0, limit)
      .map((candidate) => this.instrument(candidate, candidate.symbol, language));
  }

  /** The listing behind a symbol, for a recent item or a typed ticker. */
  lookup(symbol: string, language: Language): Instrument | null {
    for (const candidate of this.candidates) {
      if (candidate.symbol === symbol || candidate.otherPairs.includes(symbol)) {
        return this.instrument(candidate, symbol, language);
      }
    }
    return null;
  }

  private instrument(candidate: Candidate, symbol: string, language: Language): Instrument {
    const base = symbol.split("/")[0];
    return {
      symbol,
      market: candidate.market,
      kind: candidate.kind,
      name: displayName(candidate.names, language, candidate.market) ?? (candidate.kind === "crypto" ? base : symbol),
      exchange: candidate.exchange,
    };
  }
}
