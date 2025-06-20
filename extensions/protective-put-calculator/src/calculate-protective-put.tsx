/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
// Raycast API JSX compatibility workaround - ignore TypeScript errors for this file
import {
  showToast,
  Toast,
  LaunchProps,
  getPreferenceValues,
  Detail,
  ActionPanel,
  Action,
} from "@raycast/api";
import { useState, useEffect, useMemo } from "react";
import {
  calculateProtectivePut,
  formatCurrency,
  formatShares,
  formatPercentage,
  formatOptionDate,
  formatBidAskSpread,
  formatOptionContract,
} from "./calculator";
import { CalculationInputs, CalculationResult } from "./types";

interface Arguments {
  ticker: string;
  stopLoss: string;
  maxLoss: string;
}

interface Preferences {
  defaultMaxLoss: string;
  defaultHoldingPeriod: string;
  alphaVantageApiKey: string;
}

export default function CalculateProtectivePut(
  props: LaunchProps<{ arguments: Arguments }>,
) {
  const { ticker, stopLoss, maxLoss } = props.arguments;

  // Memoize preferences to prevent infinite re-renders
  const preferences = useMemo(() => getPreferenceValues<Preferences>(), []);
  const defaultMaxLoss = useMemo(
    () => preferences.defaultMaxLoss || "500",
    [preferences.defaultMaxLoss],
  );
  const defaultHoldingPeriod = useMemo(
    () => preferences.defaultHoldingPeriod || "2w",
    [preferences.defaultHoldingPeriod],
  );

  const [result, setResult] = useState<CalculationResult | null>(null);
  const [inputs, setInputs] = useState<CalculationInputs | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const runCalculation = async () => {
      try {
        // Use provided arguments or show error if missing
        if (!ticker) {
          setError(
            "Missing ticker symbol. Please provide a stock ticker as an argument.",
          );
          setIsLoading(false);
          return;
        }

        if (!stopLoss) {
          setError(
            "Missing stop loss price. Please provide a stop loss price as an argument.",
          );
          setIsLoading(false);
          return;
        }

        // Validate API key
        if (
          !preferences.alphaVantageApiKey ||
          !preferences.alphaVantageApiKey.trim()
        ) {
          setError(
            "Alpha Vantage API key is required. Please configure your API key in extension preferences.",
          );
          setIsLoading(false);
          return;
        }

        // Parse and validate inputs
        const cleanTicker = ticker.trim().toUpperCase();
        const parsedStopLoss = parseFloat(stopLoss);
        const parsedMaxLoss = parseFloat(maxLoss || defaultMaxLoss);
        const selectedHoldingPeriod = defaultHoldingPeriod as
          | "1w"
          | "2w"
          | "1m";

        // Validation
        if (!/^[A-Z]{1,5}$/.test(cleanTicker)) {
          setError(
            `"${cleanTicker}" is not a valid stock ticker (1-5 letters)`,
          );
          setIsLoading(false);
          return;
        }

        if (isNaN(parsedStopLoss) || parsedStopLoss <= 0) {
          setError("Stop loss must be a positive number");
          setIsLoading(false);
          return;
        }

        if (isNaN(parsedMaxLoss) || parsedMaxLoss <= 0) {
          setError("Maximum loss must be a positive number");
          setIsLoading(false);
          return;
        }

        if (parsedMaxLoss > 10000) {
          setError("Maximum loss cannot exceed $10,000 for safety");
          setIsLoading(false);
          return;
        }

        const calculationInputs: CalculationInputs = {
          ticker: cleanTicker,
          stopLoss: parsedStopLoss,
          maxLoss: parsedMaxLoss,
          holdingPeriod: selectedHoldingPeriod,
          alphaVantageApiKey: preferences.alphaVantageApiKey,
        };

        showToast(
          Toast.Style.Animated,
          "Calculating...",
          `Computing protective put strategy for ${cleanTicker}`,
        );

        const calculationResult =
          await calculateProtectivePut(calculationInputs);

        setInputs(calculationInputs);
        setResult(calculationResult);
        setIsLoading(false);

        showToast(
          Toast.Style.Success,
          `${cleanTicker} Strategy Complete`,
          `${formatShares(calculationResult.shares)} shares, ${calculationResult.contracts} put contracts`,
        );
      } catch (error) {
        console.error("Calculation error:", error);
        const errorMessage =
          error instanceof Error ? error.message : "Calculation failed";
        setError(errorMessage);
        setIsLoading(false);
        showToast(Toast.Style.Failure, "Calculation Error", errorMessage);
      }
    };

    runCalculation();
  }, [ticker, stopLoss, maxLoss, defaultMaxLoss, defaultHoldingPeriod]);

  if (isLoading) {
    return (
      <Detail
        isLoading={true}
        markdown="# 🛡️ Protective Put Calculator\n\nCalculating your strategy..."
      />
    );
  }

  if (error) {
    return (
      <Detail
        markdown={`# ❌ Error\n\n${error}\n\n## Setup Required\n\nThis extension requires an Alpha Vantage API key to fetch real options data.\n\n### Steps to fix:\n1. Sign up at [Alpha Vantage](https://www.alphavantage.co/support/#api-key) (free tier available)\n2. Get your API key\n3. Go to Raycast → Extension Preferences → Protective Put Calculator\n4. Enter your Alpha Vantage API key\n\n## Usage\nOnce configured, provide these arguments:\n- **ticker**: Stock symbol (e.g., AAPL)\n- **stopLoss**: Stop loss price (e.g., 150.00)\n- **maxLoss**: Maximum loss amount (optional, defaults to $500)`}
        actions={
          <ActionPanel>
            <Action.CopyToClipboard
              title="Copy Error Message"
              content={error}
            />
          </ActionPanel>
        }
      />
    );
  }

  if (!result || !inputs) {
    return (
      <Detail markdown="# ❌ No Results\n\nUnable to generate calculation results." />
    );
  }

  const markdown = `# 🛡️ Protective Put Strategy Results

## 📊 Position Summary
- **Stock**: ${inputs.ticker}
- **Shares**: ${formatShares(result.shares)}
- **Put Contracts**: ${result.contracts}
- **Stop Loss**: ${formatCurrency(inputs.stopLoss)}
- **Holding Period**: ${inputs.holdingPeriod}

## � Option Details
- **Contract**: ${formatOptionContract(result.optionDetails)}
- **Premium**: ${formatCurrency(result.optionDetails.midPrice)}
- **Bid/Ask**: ${formatBidAskSpread(result.optionDetails.bid, result.optionDetails.ask)}
- **Strike Price**: ${formatCurrency(result.optionDetails.strike)}
- **Expiration**: ${formatOptionDate(result.optionDetails.expiration)}
${result.optionDetails.volume !== "N/A" ? `- **Volume**: ${result.optionDetails.volume}` : ""}
${result.optionDetails.openInterest !== "N/A" ? `- **Open Interest**: ${result.optionDetails.openInterest}` : ""}
${result.optionDetails.impliedVolatility !== "N/A" ? `- **Implied Volatility**: ${result.optionDetails.impliedVolatility}` : ""}
${result.optionDetails.isEstimated ? `- **⚠️ Note**: Premium is estimated (real market data unavailable)` : ""}

## �💰 Cost Breakdown
- **Stock Cost**: ${formatCurrency(result.stockCost)}
- **Option Cost**: ${formatCurrency(result.optionCost)}
- **Total Investment**: ${formatCurrency(result.totalCost)}

## ⚠️ Risk Analysis
- **Maximum Loss**: ${formatCurrency(result.actualMaxLoss)}
- **Target Max Loss**: ${formatCurrency(inputs.maxLoss)}
- **Breakeven Price**: ${formatCurrency(result.breakeven)}
- **Protection Level**: ${formatPercentage(result.protectionLevel)}

## 🎯 Strategy Notes

This protective put strategy limits downside risk to **${formatCurrency(result.actualMaxLoss)}** while maintaining full upside potential above **${formatCurrency(result.breakeven)}**.

**${formatPercentage(result.protectionLevel)}** of your position is protected by the put options.
`;

  const copyText = `${inputs.ticker} Protective Put Strategy:
Position: ${formatShares(result.shares)} shares + ${result.contracts} put contracts
Option: ${formatOptionContract(result.optionDetails)}
Premium: ${formatCurrency(result.optionDetails.midPrice)}
Investment: ${formatCurrency(result.totalCost)}
Max Loss: ${formatCurrency(result.actualMaxLoss)}
Breakeven: ${formatCurrency(result.breakeven)}
Protection: ${formatPercentage(result.protectionLevel)}`;

  // Ignore TypeScript errors and render the Detail view
  return (
    <Detail
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard
            title="Copy Strategy Summary"
            content={copyText}
            shortcut={{ modifiers: ["cmd"], key: "c" }}
          />
          <Action.CopyToClipboard
            title="Copy Detailed Results"
            content={markdown}
            shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
          />
          <Action.OpenInBrowser
            title="Learn About Protective Puts"
            url="https://www.investopedia.com/terms/p/protective-put.asp"
            shortcut={{ modifiers: ["cmd"], key: "l" }}
          />
        </ActionPanel>
      }
    />
  );
}
