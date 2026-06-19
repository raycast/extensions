/**
 * Test fixtures for Portfolio Tracker.
 *
 * Provides sample portfolio data covering both US and UK markets
 * for use across all test files. These fixtures represent realistic
 * portfolio configurations that exercise the full range of functionality:
 *
 * - Multiple account types (ISA, Brokerage)
 * - US equities (AAPL, MSFT, GOOGL) on NASDAQ/NYSE
 * - US ETFs (VOO) on NYSE
 * - UK ETFs (VUSA.L, VWRL.L) on LSE — priced in GBp (pence)
 * - UK equities (AZN.L, SHEL.L) on LSE
 * - Cross-currency positions (USD assets in a GBP-denominated portfolio)
 * - Fractional shares
 *
 * All IDs are deterministic (not random UUIDs) so tests can reference
 * them reliably without needing to capture generated values.
 */

import { Portfolio, Account, Position, AccountType, AssetType } from "../utils/types";

// ──────────────────────────────────────────
// Deterministic IDs
// ──────────────────────────────────────────

export const IDS = {
  /** Account IDs */
  VANGUARD_ISA: "acc-vanguard-isa-001",
  TRADING212: "acc-trading212-002",
  EMPTY_ACCOUNT: "acc-empty-003",

  /** Position IDs — Vanguard ISA */
  VUSA: "pos-vusa-001",
  VWRL: "pos-vwrl-002",
  AZN: "pos-azn-003",
  SHEL: "pos-shel-004",

  /** Position IDs — Trading212 */
  AAPL: "pos-aapl-005",
  MSFT: "pos-msft-006",
  GOOGL: "pos-googl-007",
  VOO: "pos-voo-008",
} as const;

// ──────────────────────────────────────────
// Test Symbols
// ──────────────────────────────────────────

/**
 * All symbols used in test fixtures, grouped by market.
 * Useful for parameterised tests that need to iterate over symbols.
 */
export const TEST_SYMBOLS = {
  /** US equities — priced in USD on NASDAQ/NYSE */
  US_STOCKS: ["AAPL", "MSFT", "GOOGL"] as const,

  /** US ETFs — priced in USD on NYSE */
  US_ETFS: ["VOO"] as const,

  /** UK ETFs — priced in GBp (pence) on LSE */
  UK_ETFS: ["VUSA.L", "VWRL.L"] as const,

  /** UK equities — priced in GBp (pence) on LSE */
  UK_STOCKS: ["AZN.L", "SHEL.L"] as const,

  /** All symbols as a flat array */
  ALL: ["AAPL", "MSFT", "GOOGL", "VOO", "VUSA.L", "VWRL.L", "AZN.L", "SHEL.L"] as const,

  /** A symbol that definitely does not exist (for error testing) */
  INVALID: "ZZZZZZ123456.FAKE",

  /** FX pair symbols used for currency conversion tests */
  FX_PAIRS: {
    USD_GBP: "USDGBP=X",
    EUR_GBP: "EURGBP=X",
    GBP_USD: "GBPUSD=X",
  } as const,
} as const;

// ──────────────────────────────────────────
// Individual Position Fixtures
// ──────────────────────────────────────────

/** Vanguard S&P 500 UCITS ETF — UK-listed, priced in GBp */
export const POSITION_VUSA: Position = {
  id: IDS.VUSA,
  symbol: "VUSA.L",
  name: "Vanguard S&P 500 UCITS ETF",
  units: 50,
  currency: "GBP",
  assetType: AssetType.ETF,
  addedAt: "2024-03-15T10:00:00.000Z",
};

/** Vanguard FTSE All-World UCITS ETF — UK-listed, priced in GBp */
export const POSITION_VWRL: Position = {
  id: IDS.VWRL,
  symbol: "VWRL.L",
  name: "Vanguard FTSE All-World UCITS ETF",
  units: 100,
  currency: "GBP",
  assetType: AssetType.ETF,
  addedAt: "2024-01-10T09:30:00.000Z",
};

/** AstraZeneca PLC — UK equity, priced in GBp */
export const POSITION_AZN: Position = {
  id: IDS.AZN,
  symbol: "AZN.L",
  name: "AstraZeneca PLC",
  units: 25,
  currency: "GBP",
  assetType: AssetType.EQUITY,
  addedAt: "2024-06-01T14:00:00.000Z",
};

/** Shell PLC — UK equity, priced in GBp */
export const POSITION_SHEL: Position = {
  id: IDS.SHEL,
  symbol: "SHEL.L",
  name: "Shell PLC",
  units: 40,
  currency: "GBP",
  assetType: AssetType.EQUITY,
  addedAt: "2024-05-20T11:00:00.000Z",
};

/** Apple Inc. — US equity, priced in USD */
export const POSITION_AAPL: Position = {
  id: IDS.AAPL,
  symbol: "AAPL",
  name: "Apple Inc.",
  units: 30,
  currency: "USD",
  assetType: AssetType.EQUITY,
  addedAt: "2024-02-14T15:00:00.000Z",
};

/** Microsoft Corporation — US equity, priced in USD */
export const POSITION_MSFT: Position = {
  id: IDS.MSFT,
  symbol: "MSFT",
  name: "Microsoft Corporation",
  units: 15,
  currency: "USD",
  assetType: AssetType.EQUITY,
  addedAt: "2024-04-01T12:00:00.000Z",
};

/** Alphabet Inc. — US equity, priced in USD, fractional shares */
export const POSITION_GOOGL: Position = {
  id: IDS.GOOGL,
  symbol: "GOOGL",
  name: "Alphabet Inc.",
  units: 10.5,
  currency: "USD",
  assetType: AssetType.EQUITY,
  addedAt: "2024-07-01T16:30:00.000Z",
};

/** Vanguard S&P 500 ETF — US-listed, priced in USD */
export const POSITION_VOO: Position = {
  id: IDS.VOO,
  symbol: "VOO",
  name: "Vanguard S&P 500 ETF",
  units: 5,
  currency: "USD",
  assetType: AssetType.ETF,
  addedAt: "2024-03-01T10:00:00.000Z",
};

// ──────────────────────────────────────────
// Account Fixtures
// ──────────────────────────────────────────

/** Vanguard ISA — UK tax-advantaged account with UK-listed positions */
export const ACCOUNT_VANGUARD_ISA: Account = {
  id: IDS.VANGUARD_ISA,
  name: "Vanguard ISA",
  type: AccountType.ISA,
  createdAt: "2024-01-01T00:00:00.000Z",
  positions: [POSITION_VUSA, POSITION_VWRL, POSITION_AZN, POSITION_SHEL],
};

/** Trading212 brokerage — general account with US-listed positions */
export const ACCOUNT_TRADING212: Account = {
  id: IDS.TRADING212,
  name: "Trading212",
  type: AccountType.BROKERAGE,
  createdAt: "2024-02-01T00:00:00.000Z",
  positions: [POSITION_AAPL, POSITION_MSFT, POSITION_GOOGL, POSITION_VOO],
};

/** Empty account — for testing empty states and "add first position" flows */
export const ACCOUNT_EMPTY: Account = {
  id: IDS.EMPTY_ACCOUNT,
  name: "New Account",
  type: AccountType.GIA,
  createdAt: "2025-07-15T00:00:00.000Z",
  positions: [],
};

// ──────────────────────────────────────────
// Portfolio Fixtures
// ──────────────────────────────────────────

/**
 * Full sample portfolio with two accounts covering both US and UK markets.
 *
 * Contains:
 * - 1 ISA with 4 UK positions (2 ETFs, 2 equities)
 * - 1 Brokerage with 4 US positions (3 equities, 1 ETF)
 * - 8 positions total across 2 currencies (GBP, USD)
 *
 * This fixture exercises:
 * - Multiple account types
 * - Cross-currency conversion (USD → GBP)
 * - Minor currency normalisation (GBp → GBP for LSE positions)
 * - Fractional shares (GOOGL has 10.5 units)
 * - Various asset types (EQUITY, ETF)
 */
export const SAMPLE_PORTFOLIO: Portfolio = {
  accounts: [ACCOUNT_VANGUARD_ISA, ACCOUNT_TRADING212],
  updatedAt: "2025-07-15T12:00:00.000Z",
};

/**
 * Portfolio with a single empty account.
 * Used for testing the "add your first position" flow.
 */
export const EMPTY_ACCOUNT_PORTFOLIO: Portfolio = {
  accounts: [ACCOUNT_EMPTY],
  updatedAt: "2025-07-15T00:00:00.000Z",
};

/**
 * Completely empty portfolio — no accounts at all.
 * Used for testing the first-launch onboarding/welcome state.
 */
export const EMPTY_PORTFOLIO: Portfolio = {
  accounts: [],
  updatedAt: "2025-07-15T00:00:00.000Z",
};

/**
 * Portfolio with a single account containing one position.
 * Simplest non-empty portfolio, useful for focused unit tests.
 */
export const MINIMAL_PORTFOLIO: Portfolio = {
  accounts: [
    {
      id: "acc-minimal-001",
      name: "Simple Account",
      type: AccountType.GIA,
      createdAt: "2025-01-01T00:00:00.000Z",
      positions: [POSITION_AAPL],
    },
  ],
  updatedAt: "2025-07-15T00:00:00.000Z",
};

// ──────────────────────────────────────────
// Search Query Fixtures
// ──────────────────────────────────────────

/**
 * Search queries expected to return meaningful results.
 * Used for integration tests against the Yahoo Finance API.
 *
 * Each entry includes the query string and at least one symbol
 * that should appear in the results.
 */
export const SEARCH_QUERIES = [
  {
    query: "S&P 500",
    description: "Broad index search should return S&P 500 ETFs",
    expectedSymbols: ["VOO", "VUSA.L"], // at least one of these
  },
  {
    query: "AAPL",
    description: "Ticker search should return Apple",
    expectedSymbols: ["AAPL"],
  },
  {
    query: "Vanguard",
    description: "Fund family search should return Vanguard products",
    expectedSymbols: [], // any Vanguard result is acceptable
  },
  {
    query: "AstraZeneca",
    description: "Company name search should return AZN",
    expectedSymbols: ["AZN.L", "AZN"],
  },
  {
    query: "Shell",
    description: "Company name search should return Shell",
    expectedSymbols: ["SHEL.L", "SHEL"],
  },
  {
    query: "Microsoft",
    description: "Company name search should return MSFT",
    expectedSymbols: ["MSFT"],
  },
] as const;

// ──────────────────────────────────────────
// Helper Functions for Tests
// ──────────────────────────────────────────

/**
 * Creates a deep clone of a portfolio fixture.
 * Useful for tests that need to mutate data without affecting other tests.
 *
 * @param portfolio - The portfolio to clone
 * @returns A deep-cloned copy
 */
export function clonePortfolio(portfolio: Portfolio): Portfolio {
  return JSON.parse(JSON.stringify(portfolio));
}

/**
 * Creates a minimal position with the given overrides.
 * Provides sensible defaults for all fields.
 *
 * @param overrides - Partial position data to merge with defaults
 * @returns A complete Position object
 */
export function createTestPosition(overrides: Partial<Position> = {}): Position {
  return {
    id: `pos-test-${Date.now()}`,
    symbol: "TEST.L",
    name: "Test Position",
    units: 10,
    currency: "GBP",
    assetType: AssetType.EQUITY,
    addedAt: new Date().toISOString(),
    ...overrides,
  };
}

/**
 * Creates a minimal account with the given overrides.
 * Provides sensible defaults for all fields.
 *
 * @param overrides - Partial account data to merge with defaults
 * @returns A complete Account object
 */
export function createTestAccount(overrides: Partial<Account> = {}): Account {
  return {
    id: `acc-test-${Date.now()}`,
    name: "Test Account",
    type: AccountType.GIA,
    createdAt: new Date().toISOString(),
    positions: [],
    ...overrides,
  };
}
