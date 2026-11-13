// The symbol index, shared by the command and the AI tools.
import { environment } from "@raycast/api";
import { CatalogStore } from "./catalog";
import { SymbolIndex } from "./search";
import { Instrument, Market, isCryptoPair, normalizeTypedSymbol } from "./symbols";

export const store = new CatalogStore(environment.supportPath);

/** The catalog and pair directory on disk, refreshed in the background once a day. */
export async function loadIndex(): Promise<SymbolIndex> {
  const [catalog, pairs] = await Promise.all([store.loadCatalog(), store.loadPairs()]);
  let document = catalog.value;
  let directory = pairs.value;
  const refreshes: Promise<void>[] = [];
  if (store.isStale(catalog)) {
    refreshes.push(
      store.refreshCatalog(document).then((fresh) => {
        document = fresh;
      }),
    );
  }
  if (store.isStale(pairs)) {
    refreshes.push(
      store.refreshPairs().then((fresh) => {
        directory = fresh;
      }),
    );
  }
  if (!document) {
    // Nothing to search yet: wait for the first download.
    const results = await Promise.allSettled(refreshes);
    const failed = results.find((result) => result.status === "rejected");
    if (!document) throw failed?.reason ?? new Error("The symbol list could not be downloaded.");
    return new SymbolIndex(document, directory);
  }
  if (refreshes.length) {
    // The copy in hand answers now; a newer one is used from the next launch.
    void Promise.allSettled(refreshes);
  }
  return new SymbolIndex(document, directory);
}

/** A ticker or pair typed by hand, which its source can price even when the catalog does not list it. */
export function typedInstrument(query: string, index: SymbolIndex | undefined): Instrument | null {
  const symbol = normalizeTypedSymbol(query.replace(/\s+/g, ""));
  if (!symbol || symbol.length < 2) return null;
  if (isCryptoPair(symbol)) {
    if (index && index.pairs.size > 0 && !index.pairs.has(symbol)) return null;
    return { symbol, market: "crypto", kind: "crypto", name: symbol.split("/")[0], exchange: "Binance Spot" };
  }
  // A typed "^FTSE" is an index whatever its exchange, so the Indices filter keeps it.
  if (symbol.startsWith("^")) return { symbol, market: "index", kind: "index", name: symbol, exchange: null };
  const suffix = /\.([A-Z]+)$/.exec(symbol)?.[1];
  const market = (suffix ? SUFFIX_MARKETS[suffix] : undefined) ?? "us";
  return { symbol, market, kind: "equity", name: symbol, exchange: null };
}

// The Yahoo suffixes of the markets the filter offers, so a typed `7203.T` stays under Japan.
const SUFFIX_MARKETS: Record<string, Market> = {
  HK: "hk",
  SS: "sh",
  SZ: "sz",
  T: "jp",
  KS: "kr",
  KQ: "kq",
  TW: "tw",
  TWO: "two",
};
