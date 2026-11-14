import { test } from "node:test";
import assert from "node:assert/strict";
import { adaptPosition, buildHoldings } from "../src/lib/adapt.ts";
import { flattenPositions } from "../src/lib/portfolio.ts";
import { WS_TFSA } from "../src/fixtures/wealthsimple.ts";
import type { AccountPosition } from "../src/lib/types.ts";

const stock: AccountPosition = {
  instrument: { kind: "etf", id: "i1", symbol: "XEQT.TO", raw_symbol: "XEQT", description: "iShares Core Equity ETF Portfolio", currency: "CAD", exchange: "TSX" },
  units: "1240",
  price: "33.12",
  cost_basis: "27.9",
  currency: "CAD",
  cash_equivalent: false,
};

const option: AccountPosition = {
  instrument: {
    kind: "option",
    id: "o1",
    symbol: "AAPL 260116C00250000",
    option_type: "CALL",
    strike_price: "250",
    expiration_date: "2027-01-15",
    multiplier: "100",
    underlying: { symbol: "AAPL", description: "Apple Inc." },
  },
  units: "2",
  price: "9.15",
  cost_basis: "6.40",
  currency: "USD",
};

test("adaptPosition maps /positions/all strings into numeric Position fields", () => {
  const { position, option: opt } = adaptPosition(stock, WS_TFSA);
  assert.ok(position && !opt);
  assert.equal(position!.units, 1240);
  assert.equal(position!.price, 33.12);
  assert.equal(position!.average_purchase_price, 27.9);
  assert.ok(Math.abs(position!.open_pnl! - (33.12 - 27.9) * 1240) < 1e-6);
  assert.equal(position!.symbol?.symbol?.raw_symbol, "XEQT");
  assert.equal(position!.symbol?.symbol?.type?.description, "ETF");
  assert.equal(position!.currency?.code, "CAD");
});

test("adaptPosition converts option cost basis from per-share to per-contract", () => {
  const { option: opt, position } = adaptPosition(option, WS_TFSA);
  assert.ok(opt && !position);
  assert.equal(opt!.average_purchase_price, 640);
  assert.equal(opt!.multiplier, 100);
  assert.equal(opt!.symbol?.option_symbol?.underlying_symbol?.symbol, "AAPL");
  assert.equal(opt!.symbol?.option_symbol?.strike_price, 250);
});

test("buildHoldings feeds flattenPositions with correct market values", () => {
  const holdings = buildHoldings(WS_TFSA, [{ currency: { code: "CAD" }, cash: 100 }], [stock, option]);
  const flat = flattenPositions([{ account: WS_TFSA, holdings }]);
  const etf = flat.find((p) => p.ticker === "XEQT.TO")!;
  const call = flat.find((p) => p.isOption)!;
  assert.ok(Math.abs(etf.marketValue! - 1240 * 33.12) < 1e-6);
  assert.ok(Math.abs(call.marketValue! - 2 * 9.15 * 100) < 1e-6);
  assert.ok(Math.abs(call.openPnl! - (1830 - 1280)) < 1e-6);
  assert.equal(holdings.balances?.[0].cash, 100);
});

test("adaptPosition tolerates nulls without inventing numbers", () => {
  const { position } = adaptPosition({ instrument: { kind: "stock", id: "x", symbol: "ZZZ" }, units: null, price: null, cost_basis: null }, WS_TFSA);
  assert.equal(position!.units, 0);
  assert.equal(position!.price, null);
  assert.equal(position!.open_pnl, null);
});
