import axios from "axios";
import { addDays, nextFriday, format } from "date-fns";
import { StockQuote, OptionData } from "./types";

export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export async function getCurrentPrice(ticker: string): Promise<StockQuote> {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker.toUpperCase()}`;
    const response = await axios.get(url, {
      timeout: 10000,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
      },
    });

    const data = response.data;

    if (!data.chart?.result?.[0]?.meta) {
      throw new ApiError(`Invalid ticker symbol: ${ticker}`);
    }

    const meta = data.chart.result[0].meta;

    return {
      symbol: meta.symbol,
      price: meta.regularMarketPrice || meta.previousClose,
      currency: meta.currency || "USD",
      marketState: meta.marketState || "REGULAR",
    };
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    if (error && typeof error === "object" && "response" in error) {
      const axiosError = error as {
        response?: { status: number };
        message?: string;
      };
      if (axiosError.response?.status === 404) {
        throw new ApiError(`Ticker ${ticker} not found`);
      }
      throw new ApiError(
        `Failed to fetch stock price: ${axiosError.message || "Network error"}`,
      );
    }
    throw new ApiError(`Unexpected error fetching stock price: ${error}`);
  }
}

export function getExpirationDate(holdingPeriod: string): string {
  const today = new Date();

  switch (holdingPeriod) {
    case "1w":
      return format(nextFriday(today), "yyyyMMdd");
    case "2w":
      return format(nextFriday(addDays(today, 7)), "yyyyMMdd");
    case "1m":
      return format(nextFriday(addDays(today, 28)), "yyyyMMdd");
    default:
      return format(nextFriday(today), "yyyyMMdd");
  }
}

// Get put premium - requires Alpha Vantage API key for real options data
export async function getPutPremium(
  ticker: string,
  strike: number,
  holdingPeriod: string,
  alphaVantageApiKey: string,
): Promise<OptionData> {
  if (!alphaVantageApiKey || !alphaVantageApiKey.trim()) {
    throw new ApiError(
      "Alpha Vantage API key is required for options data. Please configure your API key in extension preferences.",
    );
  }

  try {
    const expirationDate = getExpirationDate(holdingPeriod);
    const realOptionData = await getRealPutPremium(
      ticker,
      strike,
      expirationDate,
      alphaVantageApiKey,
    );
    return realOptionData;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(`Failed to fetch options data: ${error}`);
  }
}

interface AlphaVantageOptionData {
  contractID: string;
  symbol: string;
  expiration: string;
  strike: string;
  type: string;
  bid: string;
  ask: string;
  change: string;
  percentChange: string;
  volume: string;
  openInterest: string;
  impliedVolatility: string;
}

// Alternative function for when real options data is available
export async function getRealPutPremium(
  ticker: string,
  strike: number,
  expirationDate: string,
  apiKey: string,
): Promise<OptionData> {
  try {
    // Format expiration date for Alpha Vantage (YYYY-MM-DD format)
    const formattedExpiration = `${expirationDate.slice(0, 4)}-${expirationDate.slice(4, 6)}-${expirationDate.slice(6, 8)}`;

    // Alpha Vantage Options API endpoint
    const url = `https://www.alphavantage.co/query?function=HISTORICAL_OPTIONS&symbol=${ticker}&apikey=${apiKey}`;
    const response = await axios.get(url);

    if (response.data.Note) {
      throw new ApiError("API rate limit exceeded. Please try again later.");
    }

    if (response.data["Error Message"]) {
      throw new ApiError(
        `Alpha Vantage API error: ${response.data["Error Message"]}`,
      );
    }

    if (!response.data.data) {
      throw new ApiError("No options data available from Alpha Vantage");
    }

    // Filter for put options near our target expiration and strike
    const optionsData = response.data.data;
    const putOptions = optionsData.filter((option: AlphaVantageOptionData) => {
      const optionStrike = parseFloat(option.strike);
      return (
        option.type === "put" &&
        option.expiration === formattedExpiration &&
        Math.abs(optionStrike - strike) <= 5 // Within $5 of target strike
      );
    });

    if (putOptions.length === 0) {
      // Fallback: use Black-Scholes estimation if no exact match
      return estimateOptionPremium(ticker, strike, expirationDate);
    }

    // Find the closest strike price
    const closest = putOptions.reduce(
      (prev: AlphaVantageOptionData, curr: AlphaVantageOptionData) => {
        const prevStrike = parseFloat(prev.strike);
        const currStrike = parseFloat(curr.strike);
        return Math.abs(currStrike - strike) < Math.abs(prevStrike - strike)
          ? curr
          : prev;
      },
    );

    const bid = parseFloat(closest.bid) || 0;
    const ask = parseFloat(closest.ask) || 0;
    const midPrice =
      bid > 0 && ask > 0 ? (bid + ask) / 2 : Math.max(bid, ask) || 0.5;

    return {
      strike: parseFloat(closest.strike),
      bid,
      ask,
      midPrice,
      expiration: expirationDate,
      volume: closest.volume || "N/A",
      openInterest: closest.openInterest || "N/A",
      impliedVolatility: closest.impliedVolatility || "N/A",
      isEstimated: false,
    };
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    if (error && typeof error === "object" && "response" in error) {
      const axiosError = error as { message?: string };
      throw new ApiError(
        `Options API error: ${axiosError.message || "Network error"}`,
      );
    }
    throw new ApiError(`Failed to fetch options data: ${error}`);
  }
}

// Fallback function to estimate option premium using simplified Black-Scholes
async function estimateOptionPremium(
  ticker: string,
  strike: number,
  expirationDate: string,
): Promise<OptionData> {
  try {
    // Get current stock price for estimation
    const stockQuote = await getCurrentPrice(ticker);
    const stockPrice = stockQuote.price;

    // Calculate time to expiration in years
    const today = new Date();
    const expiry = new Date(
      parseInt(expirationDate.slice(0, 4)),
      parseInt(expirationDate.slice(4, 6)) - 1,
      parseInt(expirationDate.slice(6, 8)),
    );
    const timeToExpiry =
      (expiry.getTime() - today.getTime()) / (365.25 * 24 * 60 * 60 * 1000);

    // Simplified estimation based on intrinsic value and time value
    const intrinsicValue = Math.max(strike - stockPrice, 0);
    const timeValue = Math.max(strike * 0.02 * Math.sqrt(timeToExpiry), 0.1); // 2% implied volatility assumption
    const estimatedPremium = intrinsicValue + timeValue;

    return {
      strike,
      bid: estimatedPremium * 0.95, // Slightly below mid for bid
      ask: estimatedPremium * 1.05, // Slightly above mid for ask
      midPrice: estimatedPremium,
      expiration: expirationDate,
      volume: "N/A",
      openInterest: "N/A",
      impliedVolatility: "20%", // Estimated at 20%
      isEstimated: true,
    };
  } catch (error) {
    // Ultimate fallback - use a simple percentage of strike price
    const fallbackPremium = strike * 0.02; // 2% of strike price
    return {
      strike,
      bid: fallbackPremium * 0.95,
      ask: fallbackPremium * 1.05,
      midPrice: fallbackPremium,
      expiration: expirationDate,
      volume: "N/A",
      openInterest: "N/A",
      impliedVolatility: "20%", // Estimated
      isEstimated: true,
    };
  }
}
