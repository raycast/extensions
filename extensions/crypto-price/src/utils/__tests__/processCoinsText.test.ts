import { processCoinsText } from "../processCoinsText";

const fixtures: [string, any][] = [
  ["SOL bad1 BTC | ETH bad2 XRP", { symbols: ["SOL", "BTC", "ETH", "XRP"], primaryCount: 2 }],
  ["sol bad eth", { symbols: ["SOL", "ETH"], primaryCount: 1 }],
  ["sol eth |", { symbols: ["SOL", "ETH"], primaryCount: 2 }],
  ["     ", { symbols: ["BTC", "ETH", "BNB", "SOL", "XRP"], primaryCount: 1 }],
  ["bad", { symbols: ["BTC", "ETH", "BNB", "SOL", "XRP"], primaryCount: 1 }],
  ["|", { symbols: ["BTC", "ETH", "BNB", "SOL", "XRP"], primaryCount: 1 }],
  [" | | ", { symbols: ["BTC", "ETH", "BNB", "SOL", "XRP"], primaryCount: 1 }],
  ["bad | eth xrp", { symbols: ["ETH", "XRP"], primaryCount: 1 }],
];

for (const [text, expected] of fixtures) {
  test(text, () => {
    expect(processCoinsText(text)).toEqual(expected);
  });
}
