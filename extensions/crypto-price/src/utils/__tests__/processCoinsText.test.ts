import { processCoinsText } from "../processCoinsText";

const fixtures: [string, ReturnType<typeof processCoinsText>][] = [
  ["SOL DOGE BTC | ETH ADA XRP", { symbols: ["SOL", "DOGE", "BTC", "ETH", "ADA", "XRP"], primaryCount: 3 }],
  ["sol doge eth", { symbols: ["SOL", "DOGE", "ETH"], primaryCount: 1 }],
  ["sol eth |", { symbols: ["SOL", "ETH"], primaryCount: 2 }],
  ["     ", { symbols: ["BTC", "ETH", "BNB", "SOL", "XRP"], primaryCount: 1 }],
  ["doge", { symbols: ["DOGE"], primaryCount: 1 }],
  ["@#$", { symbols: ["BTC", "ETH", "BNB", "SOL", "XRP"], primaryCount: 1 }],
  ["|", { symbols: ["BTC", "ETH", "BNB", "SOL", "XRP"], primaryCount: 1 }],
  [" | | ", { symbols: ["BTC", "ETH", "BNB", "SOL", "XRP"], primaryCount: 1 }],
  ["doge | eth xrp", { symbols: ["DOGE", "ETH", "XRP"], primaryCount: 1 }],
];

for (const [text, expected] of fixtures) {
  test(text, () => {
    expect(processCoinsText(text)).toEqual(expected);
  });
}
