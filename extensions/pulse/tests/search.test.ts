import assert from "node:assert/strict";
import { test } from "node:test";
import { SymbolIndex, displayName, fold, readerLanguage, type CatalogDocument } from "../src/lib/search";
import { normalizeTypedSymbol, yahooSymbol } from "../src/lib/symbols";

const catalog: CatalogDocument = {
  schema: 1,
  generatedAt: "2026-11-02T00:00:00Z",
  markets: ["us", "hk", "sh", "jp", "kr", "tw"],
  securities: [
    {
      m: "us",
      c: "AAPL",
      n: { en: "Apple Inc.", "zh-Hans": "苹果公司", ja: "Apple Inc.", ko: "애플" },
      p: 0.95,
      x: "NASDAQ",
    },
    { m: "us", c: "BRK-B", n: { en: "Berkshire Hathaway" }, p: 0.85, x: "NYSE" },
    {
      m: "hk",
      c: "700",
      n: { en: "Tencent", "zh-Hant": "騰訊控股", "zh-Hans": "腾讯控股", ja: "テンセント" },
      p: 0.78,
      x: "HKEX",
    },
    { m: "sh", c: "600519", n: { "zh-Hans": "贵州茅台", en: "Kweichow Moutai" }, a: ["Moutai"], p: 0.8, x: "SSE" },
    { m: "jp", c: "7203", n: { ja: "トヨタ自動車", en: "Toyota Motor" }, p: 0.8, x: "TSE" },
    { m: "kr", c: "005930", n: { ko: "삼성전자", en: "Samsung Electronics" }, p: 0.83, x: "KOSPI" },
    { m: "tw", c: "2330", n: { "zh-Hant": "台積電", en: "TSMC" }, p: 0.88, x: "TWSE" },
    { m: "tw", c: "5488", n: { "zh-Hant": "松普", en: "SP" }, p: 0.08, x: "TPEx" },
    { m: "xx", c: "NEW", n: { en: "A market this version does not know" }, p: 1 },
  ],
  crypto: [
    { b: "BTC", p: 0.8 },
    { b: "ETH", p: 0.77 },
    { b: "FDUSD", p: 0.3 },
  ],
};
const pairs: [string, string][] = [
  ["BTC", "USDT"],
  ["BTC", "USDC"],
  ["BTC", "EUR"],
  ["ETH", "BTC"],
  ["ETH", "USDT"],
  ["FDUSD", "USDT"],
];
const index = new SymbolIndex(catalog, pairs);
const top = (query: string, language: "en" | "zh-Hans" | "zh-Hant" | "ja" | "ko" = "en") =>
  index.search(query, { language, limit: 10 }).map((hit) => hit.instrument.symbol);

test("folding ignores case, width, accents, punctuation and Traditional script", () => {
  assert.equal(fold("ＡＡＰＬ"), "aapl");
  assert.equal(fold("Nestlé"), "nestle");
  assert.equal(fold("BRK.B"), "brkb");
  assert.equal(fold("台積電"), "台积电");
  assert.equal(fold("トヨタ"), "トヨタ");
});

test("Yahoo symbols per market", () => {
  assert.equal(yahooSymbol("hk", "700"), "0700.HK");
  assert.equal(yahooSymbol("sh", "600519"), "600519.SS");
  assert.equal(yahooSymbol("kq", "196170"), "196170.KQ");
  assert.equal(yahooSymbol("two", "5274"), "5274.TWO");
  assert.equal(normalizeTypedSymbol("600519.sh"), "600519.SS");
  assert.equal(normalizeTypedSymbol("700.hk"), "0700.HK");
  assert.equal(normalizeTypedSymbol("eth/btc"), "ETH/BTC");
  assert.equal(normalizeTypedSymbol("not a ticker"), null);
});

test("finds a listing by code in every spelling", () => {
  assert.equal(top("aapl")[0], "AAPL");
  assert.equal(top("700")[0], "0700.HK");
  assert.equal(top("00700")[0], "0700.HK");
  assert.equal(top("0700.hk")[0], "0700.HK");
  assert.equal(top("600519.SH")[0], "600519.SS");
  assert.equal(top("brk.b")[0], "BRK-B");
  assert.equal(top("spx")[0], "^GSPC");
});

test("finds a listing by name in any language and script", () => {
  assert.equal(top("腾讯")[0], "0700.HK");
  assert.equal(top("騰訊")[0], "0700.HK");
  assert.equal(top("台积电")[0], "2330.TW");
  assert.equal(top("トヨタ")[0], "7203.T");
  assert.equal(top("삼성")[0], "005930.KS");
  assert.equal(top("moutai")[0], "600519.SS");
  assert.equal(top("toyota")[0], "7203.T");
  assert.equal(top("恒生")[0], "^HSI");
});

test("exact beats prefix beats substring, then popularity", () => {
  // "SP" is a whole name; the S&P 500 only starts with it.
  assert.deepEqual(top("sp").slice(0, 2), ["5488.TW", "^GSPC"]);
  // Two Latin letters never match inside a name.
  assert.ok(!top("pp").includes("AAPL"));
  assert.ok(top("ppl").includes("AAPL"));
});

test("coins lead with their best-quoted pair and list the rest on an exact code", () => {
  assert.deepEqual(top("btc"), ["BTC/USDT", "BTC/USDC", "BTC/EUR"]);
  assert.equal(top("eth")[0], "ETH/USDT");
  assert.ok(index.pairs.has("ETH/BTC"));
  // A coin with no pair in the directory is not offered.
  const thin = new SymbolIndex(catalog, [["BTC", "USDT"]]);
  assert.deepEqual(
    thin.search("eth", { language: "en" }).map((hit) => hit.instrument.symbol),
    [],
  );
});

test("market filter and unknown markets", () => {
  assert.deepEqual(
    index.search("t", { language: "en", markets: ["jp"] }).map((hit) => hit.instrument.symbol),
    ["7203.T"],
  );
  assert.equal(index.lookup("NEW", "en"), null);
  assert.deepEqual(
    index.top(["tw", "two"], 5, "en").map((item) => item.symbol),
    ["2330.TW", "5488.TW"],
  );
});

test("names follow the reader's language, with fallbacks", () => {
  assert.equal(readerLanguage("auto", "トヨタ", "en-US"), "ja");
  assert.equal(readerLanguage("auto", "삼성", "en-US"), "ko");
  assert.equal(readerLanguage("auto", "腾讯", "en-US"), "zh-Hans");
  assert.equal(readerLanguage("auto", "騰訊", "en-US"), "zh-Hant");
  assert.equal(readerLanguage("auto", "aapl", "zh-TW"), "zh-Hant");
  assert.equal(readerLanguage("auto", "aapl", "en-US"), "en");
  assert.equal(readerLanguage("ko", "腾讯", "en-US"), "ko");
  // Taiwan lists Traditional names only; a Simplified reader gets them converted.
  assert.equal(displayName({ "zh-Hant": "台積電", en: "TSMC" }, "zh-Hans", "tw"), "台积电");
  assert.equal(displayName({ "zh-Hant": "台積電", en: "TSMC" }, "ja", "tw"), "TSMC");
  assert.equal(displayName({ ko: "알테오젠" }, "en", "kq"), "알테오젠");
  assert.equal(index.lookup("0700.HK", "ja")?.name, "テンセント");
});
