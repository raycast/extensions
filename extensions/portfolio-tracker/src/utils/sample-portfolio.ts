/**
 * Sample portfolio data for the empty-state preview feature.
 *
 * When a new user opens Portfolio Tracker for the first time, they can choose
 * "See Sample Portfolio" to load a realistic demo portfolio. This gives them
 * a feel for how the extension works before adding their own data.
 *
 * All sample account and position IDs are prefixed with SAMPLE_ID_PREFIX
 * so they can be identified and removed without a deletion confirmation.
 *
 * The sample data is designed to showcase every asset class and position type
 * the extension supports:
 *
 * Accounts:
 *   - ISA          → ETF + Equity (UK-listed)
 *   - SIPP         → Global tracker ETF + Cash (locked pension account)
 *   - Brokerage    → Equity + Cash (US-listed, cross-currency)
 *   - Savings      → Cash holding
 *   - Property     → Mortgage (with full params) + Owned Outright
 *   - Debt         → Credit Card + Loan + Student Loan (paid off)
 *
 * This ensures screenshots taken from the sample portfolio cover the full
 * breadth of the extension's features.
 */

import { Account, AccountType, AssetType, DebtData, MortgageData, Position } from "./types";
import { SAMPLE_ID_PREFIX } from "./constants";

// ──────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────

/** Checks whether an account ID belongs to the sample portfolio */
export function isSampleAccount(accountId: string): boolean {
  return accountId.startsWith(SAMPLE_ID_PREFIX);
}

/** Checks whether a portfolio contains any sample accounts */
export function hasSampleAccounts(accounts: Account[]): boolean {
  return accounts.some((a) => isSampleAccount(a.id));
}

// ──────────────────────────────────────────
// Sample Positions — ISA (UK-listed ETF + Equity)
// ──────────────────────────────────────────

const SAMPLE_POSITIONS_ISA: Position[] = [
  {
    id: `${SAMPLE_ID_PREFIX}pos-vusa`,
    symbol: "VUSA.L",
    name: "Vanguard S&P 500 UCITS ETF",
    units: 50,
    currency: "GBP",
    assetType: AssetType.ETF,
    addedAt: "2024-01-10T09:30:00.000Z",
  },
  {
    id: `${SAMPLE_ID_PREFIX}pos-azn`,
    symbol: "AZN.L",
    name: "AstraZeneca PLC",
    units: 25,
    currency: "GBP",
    assetType: AssetType.EQUITY,
    addedAt: "2024-06-01T14:00:00.000Z",
  },
];

// ──────────────────────────────────────────
// Sample Positions — SIPP (Global ETF + Cash, locked pension)
// ──────────────────────────────────────────

const SAMPLE_POSITIONS_SIPP: Position[] = [
  {
    id: `${SAMPLE_ID_PREFIX}pos-vwrl`,
    symbol: "VWRL.L",
    name: "Vanguard FTSE All-World UCITS ETF",
    units: 120,
    currency: "GBP",
    assetType: AssetType.ETF,
    addedAt: "2023-04-01T09:00:00.000Z",
  },
  {
    id: `${SAMPLE_ID_PREFIX}pos-cash-sipp`,
    symbol: "CASH:GBP",
    name: "SIPP Cash Reserve",
    units: 1500,
    currency: "GBP",
    assetType: AssetType.CASH,
    priceOverride: 1,
    addedAt: "2023-04-01T09:00:00.000Z",
  },
];

// ──────────────────────────────────────────
// Sample Positions — Brokerage (US Equity + Cash)
// ──────────────────────────────────────────

const SAMPLE_POSITIONS_BROKERAGE: Position[] = [
  {
    id: `${SAMPLE_ID_PREFIX}pos-aapl`,
    symbol: "AAPL",
    name: "Apple Inc.",
    units: 10,
    currency: "USD",
    assetType: AssetType.EQUITY,
    addedAt: "2024-02-14T15:00:00.000Z",
  },
  {
    id: `${SAMPLE_ID_PREFIX}pos-cash-usd`,
    symbol: "CASH:USD",
    name: "US Dollar Cash",
    units: 2500,
    currency: "USD",
    assetType: AssetType.CASH,
    priceOverride: 1,
    addedAt: "2024-03-01T10:00:00.000Z",
  },
];

// ──────────────────────────────────────────
// Sample Positions — Savings Account (GBP Cash)
// ──────────────────────────────────────────

const SAMPLE_POSITIONS_SAVINGS: Position[] = [
  {
    id: `${SAMPLE_ID_PREFIX}pos-cash-gbp`,
    symbol: "CASH:GBP",
    name: "Emergency Fund",
    units: 5000,
    currency: "GBP",
    assetType: AssetType.CASH,
    priceOverride: 1,
    addedAt: "2024-01-05T08:00:00.000Z",
  },
];

// ──────────────────────────────────────────
// Sample Positions — Property (Mortgage + Owned Outright)
// ──────────────────────────────────────────

const SAMPLE_MORTGAGE_DATA: MortgageData = {
  totalPropertyValue: 350000,
  equity: 85000,
  valuationDate: "2023-06-15",
  postcode: "SW1A 1AA",
  mortgageRate: 4.5,
  mortgageTerm: 25,
  mortgageStartDate: "2021-03-01",
};

const SAMPLE_POSITIONS_PROPERTY: Position[] = [
  {
    id: `${SAMPLE_ID_PREFIX}pos-mortgage`,
    symbol: "PROPERTY:SW1A1AA",
    name: "London Flat",
    units: 1,
    currency: "GBP",
    assetType: AssetType.MORTGAGE,
    mortgageData: SAMPLE_MORTGAGE_DATA,
    addedAt: "2023-06-15T12:00:00.000Z",
  },
  {
    id: `${SAMPLE_ID_PREFIX}pos-owned`,
    symbol: "PROPERTY:EH11BB",
    name: "Lake District Cottage",
    units: 1,
    currency: "GBP",
    assetType: AssetType.OWNED_PROPERTY,
    mortgageData: {
      totalPropertyValue: 180000,
      equity: 180000,
      valuationDate: "2024-01-20",
      postcode: "LA23 1AU",
    },
    addedAt: "2024-01-20T10:00:00.000Z",
  },
];

// ──────────────────────────────────────────
// Sample Positions — Debt (Credit Card + Loan)
// ──────────────────────────────────────────

const SAMPLE_CREDIT_CARD_DATA: DebtData = {
  currentBalance: 1850,
  apr: 19.9,
  repaymentDayOfMonth: 15,
  monthlyRepayment: 200,
  enteredAt: "2024-06-01T00:00:00.000Z",
};

const SAMPLE_LOAN_DATA: DebtData = {
  currentBalance: 8500,
  apr: 5.9,
  repaymentDayOfMonth: 1,
  monthlyRepayment: 275,
  enteredAt: "2024-01-15T00:00:00.000Z",
  loanStartDate: "2023-01-15",
  loanEndDate: "2026-01-15",
  totalTermMonths: 36,
};

const SAMPLE_POSITIONS_DEBT: Position[] = [
  {
    id: `${SAMPLE_ID_PREFIX}pos-cc`,
    symbol: "DEBT:AMEX_GOLD",
    name: "Amex Gold Card",
    units: 1,
    currency: "GBP",
    assetType: AssetType.CREDIT_CARD,
    debtData: SAMPLE_CREDIT_CARD_DATA,
    addedAt: "2024-06-01T00:00:00.000Z",
  },
  {
    id: `${SAMPLE_ID_PREFIX}pos-loan`,
    symbol: "DEBT:CAR_LOAN",
    name: "Car Loan",
    units: 1,
    currency: "GBP",
    assetType: AssetType.AUTO_LOAN,
    debtData: SAMPLE_LOAN_DATA,
    addedAt: "2024-01-15T00:00:00.000Z",
  },
  {
    id: `${SAMPLE_ID_PREFIX}pos-sloan`,
    symbol: "DEBT:STUDENT_LOAN",
    name: "Student Loan",
    units: 1,
    currency: "GBP",
    assetType: AssetType.STUDENT_LOAN,
    debtData: { ...SAMPLE_LOAN_DATA, paidOff: true, currentBalance: 20000 },
    addedAt: "2024-01-15T00:00:00.000Z",
  },
];

// ──────────────────────────────────────────
// Sample Accounts
// ──────────────────────────────────────────

/**
 * Pre-built sample accounts ready to be merged into a portfolio.
 *
 * Contains six accounts covering every supported account and position type:
 *
 * | Account            | Type            | Positions                                |
 * |--------------------|-----------------|------------------------------------------|
 * | Sample ISA         | ISA             | ETF (VUSA.L) + Equity (AZN.L)           |
 * | Sample SIPP        | SIPP            | ETF (VWRL.L) + Cash (GBP)               |
 * | Sample Brokerage   | BROKERAGE       | Equity (AAPL) + Cash (USD)               |
 * | Sample Savings     | SAVINGS_ACCOUNT | Cash (GBP)                               |
 * | Sample Property    | PROPERTY        | Mortgage + Owned Outright                |
 * | Sample Debts       | DEBT            | Credit Card + Loan + Student Loan (paid) |
 *
 * This gives the user a realistic multi-account, cross-currency preview
 * that exercises all display features: FX conversion, GBp normalisation,
 * cash holdings, property HPI appreciation, mortgage calculations,
 * debt tracking with amortisation, locked pension accounts (for FIRE
 * dashboard split visualisation), and multiple asset types.
 */
export const SAMPLE_ACCOUNTS: Account[] = [
  {
    id: `${SAMPLE_ID_PREFIX}acc-isa`,
    name: "Sample ISA",
    type: AccountType.ISA,
    createdAt: new Date().toISOString(),
    positions: SAMPLE_POSITIONS_ISA,
  },
  {
    id: `${SAMPLE_ID_PREFIX}acc-sipp`,
    name: "Sample SIPP",
    type: AccountType.SIPP,
    createdAt: new Date().toISOString(),
    positions: SAMPLE_POSITIONS_SIPP,
  },
  {
    id: `${SAMPLE_ID_PREFIX}acc-brokerage`,
    name: "Sample Brokerage",
    type: AccountType.BROKERAGE,
    createdAt: new Date().toISOString(),
    positions: SAMPLE_POSITIONS_BROKERAGE,
  },
  {
    id: `${SAMPLE_ID_PREFIX}acc-savings`,
    name: "Sample Savings",
    type: AccountType.SAVINGS_ACCOUNT,
    createdAt: new Date().toISOString(),
    positions: SAMPLE_POSITIONS_SAVINGS,
  },
  {
    id: `${SAMPLE_ID_PREFIX}acc-property`,
    name: "Sample Property",
    type: AccountType.PROPERTY,
    createdAt: new Date().toISOString(),
    positions: SAMPLE_POSITIONS_PROPERTY,
  },
  {
    id: `${SAMPLE_ID_PREFIX}acc-debt`,
    name: "Sample Debts",
    type: AccountType.DEBT,
    createdAt: new Date().toISOString(),
    positions: SAMPLE_POSITIONS_DEBT,
  },
];
