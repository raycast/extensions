// What the AI tools share: the reader's language, symbol resolution, and quotes as plain data.
import { getPreferenceValues } from "@raycast/api";
import { SESSION_LABELS, formatDelay } from "./format";
import { loadIndex } from "./load-index";
import type { Quote } from "./quotes";
import { SymbolIndex, readerLanguage, resolveSymbol } from "./search";
import { Instrument, Language, MARKET_LABELS, quotePageUrl } from "./symbols";

const SYSTEM_LOCALE = Intl.DateTimeFormat().resolvedOptions().locale;

export function toolLanguage(text: string): Language {
  const { nameLanguage } = getPreferenceValues<Preferences>();
  return readerLanguage(nameLanguage ?? "auto", text, SYSTEM_LOCALE);
}

/** The catalog, or none when it cannot be read or downloaded: typed tickers still resolve without it. */
export async function loadIndexQuietly(): Promise<SymbolIndex | undefined> {
  try {
    return await loadIndex();
  } catch {
    return undefined;
  }
}

/** Each symbol's listing, keyed by the symbol as asked; unresolvable ones map to null. */
export async function resolveSymbols(symbols: string[]): Promise<Map<string, Instrument | null>> {
  const index = await loadIndexQuietly();
  const language = toolLanguage(symbols.join(" "));
  return new Map(symbols.map((symbol) => [symbol, resolveSymbol(symbol, index, language)]));
}

const round = (value: number | null, places = 4) =>
  value === null ? null : Number(value.toFixed(value < 1 ? Math.max(places, 8) : places));

export function describeInstrument(instrument: Instrument) {
  return {
    symbol: instrument.symbol,
    name: instrument.name,
    type: instrument.kind,
    market: MARKET_LABELS[instrument.market],
    exchange: instrument.exchange,
    url: quotePageUrl(instrument.symbol),
  };
}

export function describeQuote(quote: Quote) {
  const crypto = quote.source === "Binance Spot";
  return {
    symbol: quote.symbol,
    name: quote.name,
    price: round(quote.price),
    currency: quote.currency,
    changePercent: quote.changePercent === null ? null : Number(quote.changePercent.toFixed(2)),
    changeMeasuredAgainst: crypto ? "the price 24 hours ago" : "the previous close",
    open: round(quote.open),
    high: round(quote.high),
    low: round(quote.low),
    previousClose: round(quote.previousClose),
    session: SESSION_LABELS[quote.session],
    lastTradeAt: new Date(quote.timestamp).toISOString(),
    delay: formatDelay(quote),
    exchange: quote.exchangeName,
    source: quote.source,
    url: quotePageUrl(quote.symbol),
  };
}
