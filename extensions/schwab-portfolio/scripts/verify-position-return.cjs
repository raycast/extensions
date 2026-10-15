// Synthetic regression checks for shared UI/AI returns; no Raycast or network access.
// Run from the extension directory: node --test scripts/verify-position-return.cjs
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const ts = require("typescript");
const { test } = require("node:test");

function loadSource(file, dependencies = {}) {
  const exports = {};
  vm.runInNewContext(
    ts.transpileModule(fs.readFileSync(file, "utf8"), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2023 },
    }).outputText,
    {
      exports,
      require: (name) => {
        assert.ok(Object.hasOwn(dependencies, name), `Unexpected dependency: ${name}`);
        return dependencies[name];
      },
    },
  );
  return exports;
}

const returns = loadSource("src/lib/position-return.ts");
const accountTypes = loadSource("src/types/accounts.ts");
const cases = [
  ["long gain", {}, 1000, 100, 10],
  ["long loss", { marketValue: 900 }, 1000, -100, -10],
  ["short gain", { longQuantity: 0, shortQuantity: 10, marketValue: -900 }, -1000, 100, 10],
  ["short loss", { longQuantity: 0, shortQuantity: 10, marketValue: -1100 }, -1000, -100, -10],
  [
    "short ignores long-only P/L",
    { longQuantity: 0, shortQuantity: 10, marketValue: -900, longOpenProfitLoss: 777 },
    -1000,
    100,
    10,
  ],
  ["reported long P/L", { longOpenProfitLoss: 75 }, 1000, 75, 7.5],
  ["reported zero P/L", { longOpenProfitLoss: 0 }, 1000, 0, 0],
  ["average-long fallback", { averagePrice: undefined, averageLongPrice: 100 }, 1000, 100, 10],
  ["tax-lot fallback", { averagePrice: undefined, taxLotAverageLongPrice: 100 }, 1000, 100, 10],
  ["missing cost", { averagePrice: undefined }, undefined, undefined, undefined],
  ["reported P/L without cost", { averagePrice: undefined, longOpenProfitLoss: 75 }, undefined, 75, undefined],
  ["missing market value", { marketValue: undefined }, 1000, undefined, undefined],
  ["zero basis", { averagePrice: 0 }, 0, 1100, undefined],
  ["missing quantities", { longQuantity: undefined, shortQuantity: undefined, marketValue: 0 }, 0, 0, undefined],
  [
    "long option multiplier",
    { longQuantity: 2, averagePrice: 5, marketValue: 1200, instrument: { assetType: "OPTION", optionMultiplier: 100 } },
    1000,
    200,
    20,
  ],
  [
    "adjusted short option",
    {
      longQuantity: 0,
      shortQuantity: 2,
      averagePrice: 5,
      marketValue: -400,
      instrument: { assetType: "OPTION", optionMultiplier: 50 },
    },
    -500,
    100,
    20,
  ],
  ["missing option multiplier", { instrument: { assetType: "OPTION" } }, undefined, undefined, undefined],
  ["unsupported asset basis", { instrument: { assetType: "BOND" } }, undefined, undefined, undefined],
];

for (const [name, overrides, basis, profit, percent] of cases) {
  test(name, async () => {
    const position = {
      longQuantity: 10,
      shortQuantity: 0,
      averagePrice: 100,
      marketValue: 1100,
      currentDayProfitLoss: 5,
      currentDayProfitLossPercentage: 0.5,
      ...overrides,
      instrument: { symbol: "TEST", assetType: "EQUITY", ...overrides.instrument },
    };
    const ui = returns.getPositionReturn(position);
    assert.equal(ui.costBasis, basis);
    assert.equal(ui.unrealizedPL, profit);
    assert.equal(ui.unrealizedPLPct, percent);

    const tool = loadSource("src/tools/get-portfolio.ts", {
      "@raycast/utils": { withAccessToken: () => (fn) => fn },
      "../lib/oauth": { schwabOAuth: {} },
      "../lib/schwab-client": {
        getAccounts: async (fields) => {
          assert.equal(fields, "positions");
          return [
            {
              securitiesAccount: {
                accountNumber: "00001234",
                type: "MARGIN",
                positions: [position],
                currentBalances: { liquidationValue: 2000, cashBalance: 900 },
              },
            },
          ];
        },
        getAccountNicknames: async () => ({}),
      },
      "../lib/account-aliases": { getAccountAliases: () => ({}) },
      "../types/accounts": accountTypes,
      "../lib/position-return": returns,
    }).default;
    const result = await tool();
    const ai = result.accounts[0].positions[0];
    // AI quantities retain their existing positive-count convention for short holdings.
    if (name === "short gain") assert.equal(ai.quantity, 10);
    assert.equal(ai.unrealizedProfitLoss, profit);
    assert.equal(ai.unrealizedProfitLoss, ui.unrealizedPL);
    assert.equal(ai.symbol, "TEST");
    assert.equal(ai.marketValue, position.marketValue);
    assert.equal(result.totalValue, 2000);
    assert.equal(result.dayProfitLoss, 5);
    assert.equal(result.accounts[0].accountNumberLast4, "1234");
  });
}
