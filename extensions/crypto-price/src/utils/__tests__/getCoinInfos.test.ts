import { getCoinInfos } from "../getCoinInfos";

test("returns correct coins", () => {
  expect(getCoinInfos("ETH FOO btc ETH")).toEqual([
    { name: "Ethereum", symbol: "ETH" },
    { name: "Bitcoin", symbol: "BTC" },
  ]);
});

test("empty result from empty string", () => {
  expect(getCoinInfos("").length).toBeGreaterThan(0);
});

test("empty result from bad symbol ", () => {
  expect(getCoinInfos("foo").length).toBeGreaterThan(0);
});
