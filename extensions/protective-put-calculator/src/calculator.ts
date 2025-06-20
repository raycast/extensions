import { CalculationResult, CalculationInputs } from "./types";
import { getCurrentPrice, getPutPremium } from "./api";

export async function calculateProtectivePut(
  inputs: CalculationInputs,
): Promise<CalculationResult> {
  const { ticker, stopLoss, maxLoss, holdingPeriod, alphaVantageApiKey } =
    inputs;

  // Validate inputs
  if (stopLoss <= 0) {
    throw new Error("Stop loss must be greater than 0");
  }
  if (maxLoss <= 0) {
    throw new Error("Max loss must be greater than 0");
  }

  // Get current stock price
  const stockQuote = await getCurrentPrice(ticker);
  const currentPrice = stockQuote.price;

  if (stopLoss >= currentPrice) {
    throw new Error("Stop loss must be below current price");
  }

  // Get put option premium
  const optionData = await getPutPremium(
    ticker,
    stopLoss,
    holdingPeriod,
    alphaVantageApiKey,
  );
  const putPremium = optionData.midPrice;

  // Calculate loss per share
  const lossPerShare = currentPrice - stopLoss + putPremium;

  if (lossPerShare <= 0) {
    throw new Error("Invalid calculation: loss per share must be positive");
  }

  // Calculate initial maximum shares without considering contract rounding
  const initialMaxShares = Math.floor(maxLoss / lossPerShare);

  if (initialMaxShares <= 0) {
    throw new Error("Max loss too small for this strategy");
  }

  // Calculate number of contracts needed (1 contract = 100 shares)
  let contracts = Math.ceil(initialMaxShares / 100);

  // Recalculate shares considering contract requirements
  let shares: number;

  if (initialMaxShares >= 100) {
    // For positions >= 100 shares, adjust for contract rounding
    const contractCost = contracts * 100 * putPremium;
    const remainingForStock = maxLoss - contractCost;

    if (remainingForStock <= 0) {
      throw new Error("Max loss too small to cover option premium");
    }

    shares = Math.floor(remainingForStock / (currentPrice - stopLoss));

    // Ensure we don't exceed the contract coverage
    shares = Math.min(shares, contracts * 100);
  } else {
    // For positions < 100 shares, use 1 contract
    contracts = 1;
    shares = initialMaxShares;
  }

  if (shares <= 0) {
    throw new Error("Cannot create viable position with given parameters");
  }

  // Calculate costs and losses
  const stockCost = shares * currentPrice;
  const optionCost = contracts * 100 * putPremium;
  const totalCost = stockCost + optionCost;

  // Calculate actual maximum loss
  const stockLoss = shares * (currentPrice - stopLoss);
  const actualMaxLoss = stockLoss + optionCost;

  // Calculate breakeven point
  const breakeven = currentPrice + putPremium;

  // Protection level (what percentage of position is protected)
  const protectionLevel = (shares / (contracts * 100)) * 100;

  return {
    shares,
    contracts,
    totalCost,
    maxLoss: actualMaxLoss,
    actualMaxLoss,
    stockCost,
    optionCost,
    breakeven,
    protectionLevel: Math.min(protectionLevel, 100),
    optionDetails: optionData,
  };
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatPercentage(value: number): string {
  return `${value.toFixed(1)}%`;
}

export function formatShares(shares: number): string {
  return shares.toLocaleString();
}

export function formatOptionDate(expirationDate: string): string {
  // Convert YYYYMMDD to readable date
  const year = expirationDate.slice(0, 4);
  const month = expirationDate.slice(4, 6);
  const day = expirationDate.slice(6, 8);
  const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function formatBidAskSpread(bid: number, ask: number): string {
  return `${formatCurrency(bid)} / ${formatCurrency(ask)}`;
}

export function formatOptionContract(
  optionDetails: import("./types").OptionData,
): string {
  const expDate = formatOptionDate(optionDetails.expiration);
  const strikeFormatted = formatCurrency(optionDetails.strike);
  return `${strikeFormatted} PUT exp ${expDate}`;
}
