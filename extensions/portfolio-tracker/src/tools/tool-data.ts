/**
 * Shared data access layer for AI tools.
 *
 * AI tools are plain async functions (not React components), so they cannot
 * use hooks like `usePortfolio` or `useFireSettings`. This module provides
 * direct storage access functions that mirror the hook data but are safe
 * to call from tool entry points.
 *
 * All functions read from Raycast LocalStorage — the same backing store
 * used by the hooks — ensuring tools always see the latest persisted state.
 *
 * Portfolio valuation mirrors the logic in `usePortfolioValue`:
 * - Tradeable positions: units × cached price (or priceOverride)
 * - Cash positions: units × 1.0
 * - Debt positions: -currentBalance (negative, subtracted from total)
 * - Property positions: uses `calculateCurrentEquity` with 0% HPI (accounts
 *   for principal repayment and shared ownership, but not live market data)
 * - FX conversion: all values converted to base currency via cached rates
 */

import { LocalStorage, getPreferenceValues } from "@raycast/api";
import {
  Portfolio,
  Position,
  AssetType,
  CachedPrice,
  CachedFxRate,
  isDebtAssetType,
  isDebtArchived,
  isDebtPaidOff,
  isPropertyAssetType,
} from "../utils/types";
import { FireSettings, FIRE_STORAGE_KEY } from "../utils/fire-types";
import { STORAGE_KEYS } from "../utils/constants";
import { getDisplayName, formatCurrency, formatUnits, formatPercent } from "../utils/formatting";
import { calculateProjection, totalAnnualContribution } from "../services/fire-calculator";
import { ASSET_TYPE_LABELS, ACCOUNT_TYPE_LABELS } from "../utils/constants";
import { getCachedPrices, getCachedFxRates } from "../services/price-cache";
import { calculateCurrentEquity } from "../services/mortgage-calculator";

// ──────────────────────────────────────────
// Portfolio Loading
// ──────────────────────────────────────────

export async function loadPortfolioForTool(): Promise<Portfolio | null> {
  try {
    const raw = await LocalStorage.getItem<string>(STORAGE_KEYS.PORTFOLIO);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.accounts)) return null;
    return parsed as Portfolio;
  } catch {
    return null;
  }
}

// ──────────────────────────────────────────
// FIRE Settings Loading
// ──────────────────────────────────────────

export async function loadFireSettingsForTool(): Promise<FireSettings | null> {
  try {
    const raw = await LocalStorage.getItem<string>(FIRE_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed.targetValue !== "number") return null;
    return parsed as FireSettings;
  } catch {
    return null;
  }
}

// ──────────────────────────────────────────
// Portfolio Valuation (for tools)
// ──────────────────────────────────────────

/**
 * Computes a best-effort portfolio valuation using cached prices and FX rates.
 *
 * Mirrors the logic in `usePortfolioValue` but runs as a plain async function
 * suitable for AI tools. Uses the daily price cache so it won't make redundant
 * API calls if the main extension has already fetched today's prices.
 *
 * Limitations vs the full hook-based valuation:
 * - Property positions use raw mortgageData equity without live HPI adjustment
 * - Debt positions use the persisted currentBalance (no live sync)
 * - If prices haven't been fetched today yet, this will trigger API calls
 *
 * @param portfolio - The portfolio to value
 * @param excludedAccountIds - Account IDs to exclude from the total
 * @returns Total portfolio value in the user's base currency
 */
export async function computePortfolioValue(portfolio: Portfolio, excludedAccountIds: string[] = []): Promise<number> {
  const { baseCurrency } = getPreferenceValues<Preferences>();

  const includedAccounts = portfolio.accounts.filter((a) => !excludedAccountIds.includes(a.id));

  // Collect all unique symbols and currencies from included positions
  const symbols: string[] = [];
  const currencies = new Set<string>();

  for (const account of includedAccounts) {
    for (const pos of account.positions) {
      // Only tradeable positions need price fetches (not cash, debt, or property)
      if (
        !isDebtAssetType(pos.assetType) &&
        !isPropertyAssetType(pos.assetType) &&
        pos.assetType !== AssetType.CASH &&
        !pos.priceOverride &&
        pos.symbol
      ) {
        symbols.push(pos.symbol);
      }
      currencies.add(pos.currency);
    }
  }

  // Fetch prices and FX rates (uses daily cache — fast if already fetched today)
  let prices = new Map<string, CachedPrice>();
  let fxRates = new Map<string, CachedFxRate>();

  try {
    if (symbols.length > 0) {
      const uniqueSymbols = [...new Set(symbols)];
      const priceResult = await getCachedPrices(uniqueSymbols);
      prices = priceResult.prices;
    }
  } catch {
    // Price fetch failed — positions without prices will value at 0
  }

  try {
    const uniqueCurrencies = [...currencies];
    if (uniqueCurrencies.length > 0) {
      fxRates = await getCachedFxRates(uniqueCurrencies, baseCurrency);
    }
  } catch {
    // FX fetch failed — will default to rate 1.0
  }

  // Compute total value across all included accounts
  let totalValue = 0;

  for (const account of includedAccounts) {
    for (const position of account.positions) {
      const fxRate = fxRates.get(position.currency)?.rate ?? 1.0;

      // ── Debt positions: negative liability
      if (isDebtAssetType(position.assetType) && position.debtData) {
        if (isDebtArchived(position.debtData) || isDebtPaidOff(position.debtData)) {
          continue; // Paid-off/archived debts contribute 0
        }
        const nativeValue = -position.debtData.currentBalance;
        totalValue += nativeValue * fxRate;
        continue;
      }

      // ── Cash positions: 1 unit = 1 currency unit
      if (position.assetType === AssetType.CASH) {
        totalValue += position.units * fxRate;
        continue;
      }

      // ── Property positions: use calculateCurrentEquity with 0% HPI.
      // This correctly accounts for principal repayment since valuation
      // and shared ownership adjustments, but does not include live
      // market appreciation (which would require HPI data).
      if (isPropertyAssetType(position.assetType) && position.mortgageData) {
        const equityCalc = calculateCurrentEquity(position.mortgageData, 0);
        totalValue += equityCalc.adjustedEquity * fxRate;
        continue;
      }

      // ── Tradeable positions: units × price (or priceOverride)
      let currentPrice = 0;
      if (position.priceOverride && position.priceOverride > 0) {
        currentPrice = position.priceOverride;
      } else {
        const priceData = prices.get(position.symbol);
        currentPrice = priceData?.price ?? 0;
      }

      totalValue += position.units * currentPrice * fxRate;
    }
  }

  return totalValue;
}

// ──────────────────────────────────────────
// Portfolio Summary Builder
// ──────────────────────────────────────────

export interface ToolPortfolioSummary {
  totalAccounts: number;
  totalPositions: number;
  accounts: ToolAccountSummary[];
  assetAllocation: Record<string, { count: number; symbols: string[] }>;
  currencies: string[];
  lastUpdated: string;
}

export interface ToolAccountSummary {
  id: string;
  name: string;
  type: string;
  positionCount: number;
  positions: ToolPositionSummary[];
}

export interface ToolPositionSummary {
  id: string;
  name: string;
  symbol: string;
  type: string;
  units: number;
  currency: string;
  priceOverride?: number;
  isDebt: boolean;
  isProperty: boolean;
  debtBalance?: number;
  debtApr?: number;
  debtMonthlyRepayment?: number;
  debtPaidOff?: boolean;
  debtArchived?: boolean;
}

export function buildPortfolioSummary(portfolio: Portfolio): ToolPortfolioSummary {
  const accounts: ToolAccountSummary[] = portfolio.accounts.map((a) => ({
    id: a.id,
    name: a.name,
    type: ACCOUNT_TYPE_LABELS[a.type] ?? a.type,
    positionCount: a.positions.length,
    positions: a.positions.map((p) => buildPositionSummary(p)),
  }));

  const assetAllocation: Record<string, { count: number; symbols: string[] }> = {};
  const currencies = new Set<string>();

  for (const account of portfolio.accounts) {
    for (const pos of account.positions) {
      const typeLabel = ASSET_TYPE_LABELS[pos.assetType] ?? pos.assetType;
      if (!assetAllocation[typeLabel]) {
        assetAllocation[typeLabel] = { count: 0, symbols: [] };
      }
      assetAllocation[typeLabel].count++;
      if (pos.symbol && !assetAllocation[typeLabel].symbols.includes(pos.symbol)) {
        assetAllocation[typeLabel].symbols.push(pos.symbol);
      }
      currencies.add(pos.currency);
    }
  }

  return {
    totalAccounts: portfolio.accounts.length,
    totalPositions: portfolio.accounts.reduce((sum, a) => sum + a.positions.length, 0),
    accounts,
    assetAllocation,
    currencies: Array.from(currencies),
    lastUpdated: portfolio.updatedAt,
  };
}

function buildPositionSummary(p: Position): ToolPositionSummary {
  const summary: ToolPositionSummary = {
    id: p.id,
    name: getDisplayName(p),
    symbol: p.symbol,
    type: ASSET_TYPE_LABELS[p.assetType] ?? p.assetType,
    units: p.units,
    currency: p.currency,
    isDebt: isDebtAssetType(p.assetType),
    isProperty: isPropertyAssetType(p.assetType),
  };

  if (p.priceOverride) {
    summary.priceOverride = p.priceOverride;
  }

  if (p.debtData) {
    summary.debtBalance = p.debtData.currentBalance;
    summary.debtApr = p.debtData.apr;
    summary.debtMonthlyRepayment = p.debtData.monthlyRepayment;
    summary.debtPaidOff = isDebtPaidOff(p.debtData);
    summary.debtArchived = isDebtArchived(p.debtData);
  }

  return summary;
}

// ──────────────────────────────────────────
// FIRE Summary Builder
// ──────────────────────────────────────────

export interface ToolFireSummary {
  settings: {
    targetValue: number;
    withdrawalRate: number;
    annualInflation: number;
    annualGrowthRate: number;
    yearOfBirth: number;
    holidayEntitlement: number;
    sippAccessAge: number;
    excludedAccountIds: string[];
    targetFireAge?: number | null;
    targetFireYear?: number | null;
  };
  contributions: {
    totalMonthly: number;
    totalAnnual: number;
    items: Array<{
      positionName: string;
      accountName: string;
      monthlyAmount: number;
    }>;
  };
  projection: {
    fireYear: number | null;
    fireAge: number | null;
    daysToFire: number | null;
    workingDaysToFire: number | null;
    currentPortfolioValue: number;
    targetValue: number;
    realGrowthRate: number;
    targetHitInWindow: boolean;
  };
}

/**
 * Builds a FIRE summary with a real portfolio valuation.
 *
 * Fetches cached prices and FX rates to compute the included portfolio value,
 * mirroring what the FIRE Dashboard shows. This is async because it may need
 * to hit the price/FX cache (or API on first call of the day).
 */
export async function buildFireSummary(settings: FireSettings, portfolio: Portfolio | null): Promise<ToolFireSummary> {
  const accounts = portfolio?.accounts ?? [];

  // Compute the real included portfolio value using cached prices + FX
  const includedPortfolioValue = portfolio ? await computePortfolioValue(portfolio, settings.excludedAccountIds) : 0;

  const annualContrib = totalAnnualContribution(settings.contributions);

  const projection = calculateProjection({
    currentPortfolioValue: includedPortfolioValue,
    targetValue: settings.targetValue,
    annualGrowthRate: settings.annualGrowthRate,
    annualInflation: settings.annualInflation,
    annualContribution: annualContrib,
    yearOfBirth: settings.yearOfBirth,
    sippAccessAge: settings.sippAccessAge,
    holidayEntitlement: settings.holidayEntitlement,
  });

  const contributionItems = settings.contributions.map((c) => {
    const account = accounts.find((a) => a.id === c.accountId);
    const position = account?.positions.find((p) => p.id === c.positionId);
    return {
      positionName: position ? getDisplayName(position) : "Unknown Position",
      accountName: account?.name ?? "Unknown Account",
      monthlyAmount: c.monthlyAmount,
    };
  });

  return {
    settings: {
      targetValue: settings.targetValue,
      withdrawalRate: settings.withdrawalRate,
      annualInflation: settings.annualInflation,
      annualGrowthRate: settings.annualGrowthRate,
      yearOfBirth: settings.yearOfBirth,
      holidayEntitlement: settings.holidayEntitlement,
      sippAccessAge: settings.sippAccessAge,
      excludedAccountIds: settings.excludedAccountIds,
      targetFireAge: settings.targetFireAge,
      targetFireYear: settings.targetFireYear,
    },
    contributions: {
      totalMonthly: settings.contributions.reduce((sum, c) => sum + c.monthlyAmount, 0),
      totalAnnual: annualContrib,
      items: contributionItems,
    },
    projection: {
      fireYear: projection.fireYear,
      fireAge: projection.fireAge,
      daysToFire: projection.daysToFire,
      workingDaysToFire: projection.workingDaysToFire,
      currentPortfolioValue: projection.currentPortfolioValue,
      targetValue: projection.targetValue,
      realGrowthRate: projection.realGrowthRate,
      targetHitInWindow: projection.targetHitInWindow,
    },
  };
}

// ──────────────────────────────────────────
// Text Formatting Helpers for AI Responses
// ──────────────────────────────────────────

export function formatPositionForAI(p: ToolPositionSummary): string {
  const parts = [`${p.name} (${p.symbol})`];
  parts.push(`Type: ${p.type}`);
  parts.push(`Units: ${formatUnits(p.units)}`);
  parts.push(`Currency: ${p.currency}`);

  if (p.priceOverride) {
    parts.push(`Price Override: ${formatCurrency(p.priceOverride, p.currency)}/unit`);
  }

  if (p.isDebt && p.debtBalance !== undefined) {
    parts.push(`Debt Balance: ${formatCurrency(p.debtBalance, p.currency)}`);
    if (p.debtApr !== undefined) parts.push(`APR: ${formatPercent(p.debtApr, { showSign: false })}`);
    if (p.debtMonthlyRepayment !== undefined)
      parts.push(`Monthly Repayment: ${formatCurrency(p.debtMonthlyRepayment, p.currency)}`);
    if (p.debtPaidOff) parts.push(`Status: Paid Off`);
    if (p.debtArchived) parts.push(`Status: Archived`);
  }

  return parts.join(" | ");
}

export function formatAccountForAI(a: ToolAccountSummary): string {
  const lines: string[] = [];
  lines.push(`Account: ${a.name} (${a.type}) — ${a.positionCount} position(s)`);
  for (const p of a.positions) {
    lines.push(`  - ${formatPositionForAI(p)}`);
  }
  return lines.join("\n");
}
