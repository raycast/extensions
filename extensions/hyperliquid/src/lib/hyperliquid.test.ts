import { describe, expect, it } from "vitest";

import {
  aggregatePortfolioSeries,
  aggregatePositionRows,
  applyLiveMids,
  applyLiveMidsToPositions,
  buildMarketRows,
  candleToChartCandle,
  computeMarketOverview,
  extractPortfolioSeries,
  getCandleRange,
  prioritizeFavoriteMarkets,
  recomputeSummary,
  sortMarkets,
} from "./hyperliquid";
import type { PortfolioResponse } from "@nktkas/hyperliquid";

import type { MarketRow, PositionRow, Wallet } from "./types";

function market(coin: string, overrides: Partial<MarketRow> = {}): MarketRow {
  return {
    coin,
    price: 1,
    markPrice: 1,
    previousDayPrice: 1,
    dayChange: 0,
    funding: 0,
    openInterest: 0,
    dayVolumeBase: 0,
    dayVolumeUsd: 0,
    maxLeverage: 50,
    ...overrides,
  };
}

describe("Hyperliquid data helpers", () => {
  it("builds searchable market rows sorted by 24h notional volume", () => {
    const rows = buildMarketRows(
      [
        {
          universe: [
            { name: "BTC", szDecimals: 5, maxLeverage: 50, marginTableId: 1 },
            { name: "ETH", szDecimals: 4, maxLeverage: 50, marginTableId: 2 },
            { name: "OLD", szDecimals: 2, maxLeverage: 10, marginTableId: 3, isDelisted: true },
          ],
          marginTables: [],
          collateralToken: 0,
        },
        [
          {
            markPx: "67000",
            midPx: "67001",
            prevDayPx: "66000",
            funding: "0.0001",
            openInterest: "100",
            premium: null,
            oraclePx: "66990",
            impactPxs: null,
            dayBaseVlm: "10",
            dayNtlVlm: "670000",
          },
          {
            markPx: "3500",
            midPx: null,
            prevDayPx: "3400",
            funding: "-0.0002",
            openInterest: "200",
            premium: null,
            oraclePx: "3490",
            impactPxs: null,
            dayBaseVlm: "1000",
            dayNtlVlm: "3500000",
          },
          {
            markPx: "1",
            midPx: "1",
            prevDayPx: "1",
            funding: "0",
            openInterest: "1",
            premium: null,
            oraclePx: "1",
            impactPxs: null,
            dayBaseVlm: "1",
            dayNtlVlm: "1",
          },
        ],
      ],
      { BTC: "67123.45" },
    );

    expect(rows.map((row) => row.coin)).toEqual(["ETH", "BTC"]);
    expect(rows[1]).toMatchObject({ coin: "BTC", price: 67123.45, funding: 0.0001 });
    expect(rows[0].dayChange).toBeCloseTo((3500 - 3400) / 3400);
  });

  it("aggregates position rows across wallets", () => {
    const wallets: Wallet[] = [
      { id: "main", label: "Main", address: "0x0000000000000000000000000000000000000001" },
      { id: "vault", label: "Vault", address: "0x0000000000000000000000000000000000000002" },
    ];
    const rows = aggregatePositionRows(wallets, [
      [
        {
          marginSummary: { accountValue: "1000", totalNtlPos: "300", totalRawUsd: "1000", totalMarginUsed: "100" },
          crossMarginSummary: { accountValue: "1000", totalNtlPos: "300", totalRawUsd: "1000", totalMarginUsed: "100" },
          crossMaintenanceMarginUsed: "0",
          withdrawable: "900",
          time: 1,
          assetPositions: [
            {
              type: "oneWay",
              position: {
                coin: "BTC",
                szi: "0.01",
                leverage: { type: "cross", value: 10 },
                entryPx: "65000",
                positionValue: "670",
                unrealizedPnl: "20",
                returnOnEquity: "0.2",
                liquidationPx: "50000",
                marginUsed: "67",
                maxLeverage: 50,
                cumFunding: { allTime: "0", sinceOpen: "0", sinceChange: "0" },
              },
            },
          ],
        },
      ],
      [
        {
          marginSummary: { accountValue: "500", totalNtlPos: "200", totalRawUsd: "500", totalMarginUsed: "50" },
          crossMarginSummary: { accountValue: "500", totalNtlPos: "200", totalRawUsd: "500", totalMarginUsed: "50" },
          crossMaintenanceMarginUsed: "0",
          withdrawable: "450",
          time: 1,
          assetPositions: [
            {
              type: "oneWay",
              position: {
                coin: "ETH",
                szi: "-0.5",
                leverage: { type: "isolated", value: 5, rawUsd: "50" },
                entryPx: "3600",
                positionValue: "1750",
                unrealizedPnl: "-25",
                returnOnEquity: "-0.1",
                liquidationPx: null,
                marginUsed: "350",
                maxLeverage: 50,
                cumFunding: { allTime: "0", sinceOpen: "0", sinceChange: "0" },
              },
            },
          ],
        },
      ],
    ]);

    expect(rows.summary).toMatchObject({ accountValue: 1500, unrealizedPnl: -5, marginUsed: 150 });
    expect(rows.positions.map((position) => `${position.walletLabel}:${position.coin}:${position.side}`)).toEqual([
      "Main:BTC:Long",
      "Vault:ETH:Short",
    ]);
  });

  it("overlays live mids onto market rows", () => {
    const rows = [
      {
        coin: "BTC",
        price: 100,
        markPrice: 100,
        previousDayPrice: 80,
        dayChange: 0.25,
        funding: 0,
        openInterest: 1,
        dayVolumeBase: 1,
        dayVolumeUsd: 100,
        maxLeverage: 50,
      },
      {
        coin: "ETH",
        price: 50,
        markPrice: 50,
        previousDayPrice: 40,
        dayChange: 0.25,
        funding: 0,
        openInterest: 1,
        dayVolumeBase: 1,
        dayVolumeUsd: 50,
        maxLeverage: 50,
      },
    ];

    expect(applyLiveMids(rows, { BTC: "120" })).toEqual([{ ...rows[0], price: 120, dayChange: 0.5 }, rows[1]]);
  });

  it("prioritizes favorite markets while preserving group order", () => {
    const markets = [
      {
        coin: "SOL",
        price: 1,
        markPrice: 1,
        previousDayPrice: 1,
        dayChange: 0,
        funding: 0,
        openInterest: 0,
        dayVolumeBase: 0,
        dayVolumeUsd: 300,
        maxLeverage: 20,
      },
      {
        coin: "BTC",
        price: 1,
        markPrice: 1,
        previousDayPrice: 1,
        dayChange: 0,
        funding: 0,
        openInterest: 0,
        dayVolumeBase: 0,
        dayVolumeUsd: 200,
        maxLeverage: 50,
      },
      {
        coin: "ETH",
        price: 1,
        markPrice: 1,
        previousDayPrice: 1,
        dayChange: 0,
        funding: 0,
        openInterest: 0,
        dayVolumeBase: 0,
        dayVolumeUsd: 100,
        maxLeverage: 50,
      },
    ];

    expect(prioritizeFavoriteMarkets(markets, ["ETH", "BTC"]).map((market) => market.coin)).toEqual([
      "BTC",
      "ETH",
      "SOL",
    ]);
  });

  it("maps API candles and computes interval lookback ranges", () => {
    expect(
      candleToChartCandle({ t: 1, T: 2, s: "BTC", i: "1h", o: "1", h: "3", l: "0.5", c: "2", v: "10", n: 3 }),
    ).toEqual({
      time: 1,
      open: 1,
      high: 3,
      low: 0.5,
      close: 2,
      volume: 10,
    });

    expect(getCandleRange("1h", 1_000_000).startTime).toBe(1_000_000 - 1000 * 60 * 60 * 24 * 3);
    expect(getCandleRange("4h", 1_000_000).startTime).toBe(1_000_000 - 1000 * 60 * 60 * 24 * 14);
    expect(getCandleRange("1d", 1_000_000).startTime).toBe(1_000_000 - 1000 * 60 * 60 * 24 * 120);
  });

  it("derives mark price and maintenance margin for positions", () => {
    const wallets: Wallet[] = [{ id: "m", label: "Main", address: "0x0000000000000000000000000000000000000001" }];
    const rows = aggregatePositionRows(wallets, [
      [
        {
          marginSummary: { accountValue: "1000", totalNtlPos: "670", totalRawUsd: "1000", totalMarginUsed: "67" },
          crossMarginSummary: { accountValue: "1000", totalNtlPos: "670", totalRawUsd: "1000", totalMarginUsed: "67" },
          crossMaintenanceMarginUsed: "20",
          withdrawable: "900",
          time: 1,
          assetPositions: [
            {
              type: "oneWay",
              position: {
                coin: "BTC",
                szi: "0.01",
                leverage: { type: "cross", value: 10 },
                entryPx: "65000",
                positionValue: "670",
                unrealizedPnl: "20",
                returnOnEquity: "0.2",
                liquidationPx: "50000",
                marginUsed: "67",
                maxLeverage: 50,
                cumFunding: { allTime: "0", sinceOpen: "0", sinceChange: "0" },
              },
            },
          ],
        },
      ],
    ]);

    expect(rows.summary.maintenanceMarginUsed).toBe(20);
    expect(rows.positions[0].markPrice).toBeCloseTo(67000);
  });

  it("merges main-account and builder-dex (HIP-3) positions into one wallet view", () => {
    const wallets: Wallet[] = [{ id: "m", label: "Main", address: "0x0000000000000000000000000000000000000001" }];
    const rows = aggregatePositionRows(wallets, [
      [
        {
          marginSummary: { accountValue: "1000", totalNtlPos: "670", totalRawUsd: "1000", totalMarginUsed: "67" },
          crossMarginSummary: { accountValue: "1000", totalNtlPos: "670", totalRawUsd: "1000", totalMarginUsed: "67" },
          crossMaintenanceMarginUsed: "10",
          withdrawable: "900",
          time: 1,
          assetPositions: [
            {
              type: "oneWay",
              position: {
                coin: "BTC",
                szi: "0.01",
                leverage: { type: "cross", value: 10 },
                entryPx: "65000",
                positionValue: "670",
                unrealizedPnl: "20",
                returnOnEquity: "0.2",
                liquidationPx: "50000",
                marginUsed: "67",
                maxLeverage: 50,
                cumFunding: { allTime: "0", sinceOpen: "0", sinceChange: "0" },
              },
            },
          ],
        },
        {
          marginSummary: { accountValue: "200", totalNtlPos: "100", totalRawUsd: "200", totalMarginUsed: "50" },
          crossMarginSummary: { accountValue: "200", totalNtlPos: "100", totalRawUsd: "200", totalMarginUsed: "50" },
          crossMaintenanceMarginUsed: "5",
          withdrawable: "150",
          time: 1,
          assetPositions: [
            {
              type: "oneWay",
              position: {
                coin: "GOLD",
                szi: "2",
                leverage: { type: "isolated", value: 4, rawUsd: "50" },
                entryPx: "30",
                positionValue: "100",
                unrealizedPnl: "-15",
                returnOnEquity: "-0.3",
                liquidationPx: "20",
                marginUsed: "50",
                maxLeverage: 10,
                cumFunding: { allTime: "0", sinceOpen: "0", sinceChange: "0" },
              },
            },
          ],
        },
      ],
    ]);

    expect(rows.summary).toMatchObject({
      accountValue: 1200,
      unrealizedPnl: 5,
      marginUsed: 117,
      maintenanceMarginUsed: 15,
    });
    expect(rows.positions.map((position) => position.coin)).toEqual(["BTC", "GOLD"]);
  });
});

describe("markets analytics", () => {
  const markets = [
    market("BTC", { dayChange: 0.05, funding: 0.0001, dayVolumeUsd: 300, openInterest: 2, markPrice: 100 }),
    market("ETH", { dayChange: -0.1, funding: -0.0009, dayVolumeUsd: 200, openInterest: 5, markPrice: 50 }),
    market("SOL", { dayChange: 0.2, funding: 0.0003, dayVolumeUsd: 100, openInterest: 10, markPrice: 10 }),
  ];

  it("sorts by the chosen dimension", () => {
    expect(sortMarkets(markets, "volume").map((m) => m.coin)).toEqual(["BTC", "ETH", "SOL"]);
    expect(sortMarkets(markets, "gainers").map((m) => m.coin)).toEqual(["SOL", "BTC", "ETH"]);
    expect(sortMarkets(markets, "losers").map((m) => m.coin)).toEqual(["ETH", "BTC", "SOL"]);
    expect(sortMarkets(markets, "funding").map((m) => m.coin)).toEqual(["ETH", "SOL", "BTC"]);
  });

  it("aggregates a market overview", () => {
    expect(computeMarketOverview(markets)).toEqual({
      marketCount: 3,
      totalVolumeUsd: 600,
      totalOpenInterestUsd: 2 * 100 + 5 * 50 + 10 * 10,
    });
  });
});

describe("live position updates", () => {
  const position: PositionRow = {
    id: "m-BTC",
    walletId: "m",
    walletLabel: "Main",
    coin: "BTC",
    side: "Long",
    size: 0.01,
    leverage: 10,
    leverageType: "cross",
    entryPrice: 65000,
    markPrice: 67000,
    positionValue: 670,
    unrealizedPnl: 20,
    returnOnEquity: 0.2,
    liquidationPrice: 50000,
    marginUsed: 67,
  };

  it("recomputes mark, value and uPnL from live mids", () => {
    const [updated] = applyLiveMidsToPositions([position], { BTC: "70000" });
    expect(updated.markPrice).toBe(70000);
    expect(updated.positionValue).toBeCloseTo(700);
    expect(updated.unrealizedPnl).toBeCloseTo(0.01 * (70000 - 65000));
    expect(updated.returnOnEquity).toBeCloseTo((0.01 * 5000) / 67);
  });

  it("leaves positions without a live mid untouched", () => {
    expect(applyLiveMidsToPositions([position], {})).toEqual([position]);
  });

  it("re-derives the summary uPnL from updated positions", () => {
    const updated = applyLiveMidsToPositions([position], { BTC: "70000" });
    const summary = recomputeSummary(
      { accountValue: 1000, unrealizedPnl: 20, marginUsed: 67, maintenanceMarginUsed: 20 },
      updated,
    );
    expect(summary.unrealizedPnl).toBeCloseTo(50);
    // Account value moves by the +30 change in unrealized PnL.
    expect(summary.accountValue).toBeCloseTo(1030);
  });
});

describe("portfolio series", () => {
  const empty = { accountValueHistory: [], pnlHistory: [], vlm: "0" };
  const periods: PortfolioResponse = [
    ["day", empty],
    ["week", empty],
    ["month", empty],
    ["allTime", empty],
    ["perpDay", { accountValueHistory: [[1, "100"]], pnlHistory: [[1, "0"]], vlm: "0" }],
    [
      "perpWeek",
      {
        accountValueHistory: [
          [1, "100"],
          [2, "120"],
        ],
        pnlHistory: [
          [1, "0"],
          [2, "20"],
        ],
        vlm: "0",
      },
    ],
    ["perpMonth", empty],
    ["perpAllTime", empty],
  ];

  it("extracts the requested perp period and metric", () => {
    expect(extractPortfolioSeries(periods, "week", "accountValue")).toEqual([
      { time: 1, value: 100 },
      { time: 2, value: 120 },
    ]);
    expect(extractPortfolioSeries(periods, "week", "pnl")).toEqual([
      { time: 1, value: 0 },
      { time: 2, value: 20 },
    ]);
    expect(extractPortfolioSeries(periods, "day", "accountValue")).toEqual([{ time: 1, value: 100 }]);
  });

  it("sums multiple wallets' series by timestamp", () => {
    const merged = aggregatePortfolioSeries([
      [
        { time: 1, value: 100 },
        { time: 2, value: 120 },
      ],
      [
        { time: 1, value: 50 },
        { time: 2, value: 60 },
      ],
    ]);
    expect(merged).toEqual([
      { time: 1, value: 150 },
      { time: 2, value: 180 },
    ]);
  });

  it("returns a single wallet's series unchanged", () => {
    const series = [{ time: 1, value: 100 }];
    expect(aggregatePortfolioSeries([series])).toBe(series);
  });
});
