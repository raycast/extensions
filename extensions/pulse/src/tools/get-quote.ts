import { getPreferenceValues } from "@raycast/api";
import { loadIndex, typedInstrument } from "../lib/load";
import { Quote, fetchQuote } from "../lib/quotes";
import { SymbolIndex, readerLanguage } from "../lib/search";
import { Instrument, Language, quotePageUrl } from "../lib/symbols";

type Input = {
  /**
   * The instruments to price, up to 10. Each is a symbol as the Search Symbols tool returns it
   * ("AAPL", "2330.TW", "0700.HK", "^GSPC", "BTC/USDT"), or a ticker or company name to look up ("Tesla", "台積電").
   * For crypto, pass the coin's ticker or pair ("BTC" or "BTC/USDT"), not its full name.
   */
  symbols: string[];
};

/**
 * Get the latest price of stocks, ETFs, indices and crypto: price, change since the previous close
 * (the last 24 hours for crypto), open, high, low, market session, quote delay, and a sample of today's prices.
 */
export default async function tool(input: Input) {
  const index = await loadIndex();
  const { nameLanguage } = getPreferenceValues<Preferences>();
  const locale = Intl.DateTimeFormat().resolvedOptions().locale;
  return Promise.all(
    input.symbols.slice(0, 10).map(async (query) => {
      const instrument = resolve(index, query, readerLanguage(nameLanguage ?? "auto", query, locale));
      if (!instrument) return { query, error: "No stock, index or crypto pair matches this." };
      try {
        return describe(instrument, await fetchQuote(instrument.symbol));
      } catch (error) {
        return { query, symbol: instrument.symbol, error: error instanceof Error ? error.message : String(error) };
      }
    }),
  );
}

function resolve(index: SymbolIndex, query: string, language: Language): Instrument | null {
  const trimmed = query.trim();
  const typed = typedInstrument(trimmed, index);
  // A full symbol ("2330.TW", "BTC/USDT", "^GSPC") is taken as given. A name with spaces or no
  // symbol marks ("D.R. Horton", "BTC") goes through search, which ranks the coin ahead of
  // the ETF that shares its ticker.
  if (typed && /[./^=]/.test(trimmed) && !/\s/.test(trimmed)) return index.lookup(typed.symbol, language) ?? typed;
  return index.search(trimmed, { language, limit: 1 })[0]?.instrument ?? typed;
}

const iso = (timestamp: number) => new Date(timestamp).toISOString();
// Drop floating-point noise like 7.1200000000000045 and float32 values like 148.229995728,
// keeping significant digits so a price of 0.00000012 BTC stays 0.00000012.
const tidy = (value: number | null) => (value === null ? null : Number(value.toPrecision(8)));
const percent = (value: number | null) => (value === null ? null : Number(value.toFixed(2)));

function describe(instrument: Instrument, quote: Quote) {
  const crypto = quote.source === "Binance Spot";
  const change = quote.previousClose === null ? null : quote.price - quote.previousClose;
  // A dozen points tell the day's shape without spending the whole series.
  const step = Math.max(1, Math.ceil(quote.series.length / 12));
  const sample = quote.series.filter((_, i) => i % step === 0 || i === quote.series.length - 1);
  return {
    symbol: instrument.symbol,
    name: instrument.name === instrument.symbol && quote.name ? quote.name : instrument.name,
    type: instrument.kind,
    exchange: quote.exchangeName ?? instrument.exchange,
    currency: quote.currency,
    price: quote.price,
    change: tidy(change),
    changePercent: percent(quote.changePercent),
    changeMeasuredAgainst: crypto ? "price 24 hours ago" : "previous close",
    open: tidy(quote.open),
    high: tidy(quote.high),
    low: tidy(quote.low),
    previousClose: tidy(quote.previousClose),
    session: quote.session,
    quoteTime: iso(quote.timestamp),
    delayMinutes: quote.delaySeconds === null ? "unknown" : Math.ceil(quote.delaySeconds / 60),
    source: quote.source,
    todaysPrices: sample.map((point) => ({ time: iso(point.time), price: point.price })),
    url: quotePageUrl(instrument.symbol),
  };
}
