import { CalculationInputs, CalculationResult } from "./types";

export function calculatePositionDetails(inputs: CalculationInputs): CalculationResult | { error: string } {
  const { mode, capital, riskPercent, entry, slPrice, targetPrice, rrr, slPercent, targetPercent, fixedRiskAmt } =
    inputs;

  let sl: number = 0;
  let target: number = 0;
  let riskAmount: number = 0;

  // Basic input validation for universally required fields
  if (isNaN(entry) || entry <= 0) return { error: "Invalid Entry Price" };
  if (isNaN(capital) || capital <= 0) return { error: "Invalid Capital" };

  // Risk Percent is not used in "Fixed Risk ₹" mode for riskAmount calculation
  if (mode !== "Fixed Risk" && (isNaN(riskPercent) || riskPercent <= 0)) {
    return { error: "Invalid Risk Percentage" };
  }

  try {
    // Determine SL and Target based on mode
    switch (mode) {
      case "Fixed Price":
        if (typeof slPrice === "undefined" || isNaN(slPrice) || slPrice <= 0) {
          return { error: "Stop Loss Price is invalid or missing" };
        }
        if (typeof targetPrice === "undefined" || isNaN(targetPrice) || targetPrice <= 0) {
          return { error: "Target Price is invalid or missing" };
        }
        if (entry <= slPrice) {
          return { error: "Entry must be above Stop Loss" };
        }
        if (entry >= targetPrice) {
          return { error: "Entry must be below Target" };
        }
        sl = slPrice;
        target = targetPrice;
        break;

      case "RRR-Based":
        if (typeof slPrice === "undefined" || isNaN(slPrice) || slPrice <= 0) {
          return { error: "Stop Loss Price is invalid or missing" };
        }
        if (typeof rrr === "undefined" || isNaN(rrr) || rrr <= 0) {
          return { error: "Reward/Risk Ratio is invalid or missing" };
        }
        if (entry <= slPrice) {
          return { error: "Entry must be above Stop Loss" };
        }
        sl = slPrice;
        target = entry + (entry - sl) * rrr;
        break;

      case "% SL/Target":
        if (typeof slPercent === "undefined" || isNaN(slPercent) || slPercent <= 0) {
          return { error: "Stop Loss % is invalid or missing" };
        }
        if (typeof targetPercent === "undefined" || isNaN(targetPercent) || targetPercent <= 0) {
          return { error: "Target % is invalid or missing" };
        }
        sl = entry * (1 - slPercent / 100);
        target = entry * (1 + targetPercent / 100);
        if (entry <= sl) {
          return { error: "Calculated SL (% based) is not below Entry" };
        }
        break;

      case "Fixed Risk":
        if (typeof slPrice === "undefined" || isNaN(slPrice) || slPrice <= 0) {
          return { error: "Stop Loss Price is invalid or missing" };
        }
        if (typeof fixedRiskAmt === "undefined" || isNaN(fixedRiskAmt) || fixedRiskAmt <= 0) {
          return { error: "Fixed Risk Amount is invalid or missing" };
        }
        // RRR is needed for target calculation in this mode as per our design
        if (typeof rrr === "undefined" || isNaN(rrr) || rrr <= 0) {
          return { error: "Reward/Risk Ratio is invalid or missing for target calculation" };
        }
        if (entry <= slPrice) {
          return { error: "Entry must be above Stop Loss" };
        }
        sl = slPrice;
        target = entry + (entry - sl) * rrr;
        break;

      default: {
        // Should not happen if mode is correctly typed
        const exhaustiveCheck: never = mode;
        return { error: `Unknown calculation mode: ${exhaustiveCheck}` };
      }
    }

    // --- Core Calculations ---
    const riskPerShare = entry - sl;
    if (riskPerShare <= 0) {
      return {
        error: "Risk per share is zero or negative. Check Entry and Stop Loss.",
      };
    }

    if (mode === "Fixed Risk") {
      // We've already checked fixedRiskAmt is defined and valid for this mode
      riskAmount = fixedRiskAmt as number; // Safe assertion after check
      if (riskAmount > capital) {
        return { error: "Fixed Risk Amount exceeds Capital" };
      }
    } else {
      riskAmount = capital * (riskPercent / 100);
    }

    const positionSize = riskAmount / riskPerShare;
    const investmentAmount = positionSize * entry;

    // Ensure target is valid after all calculations
    if (target <= entry) {
      return { error: "Calculated Target is not above Entry. Review inputs." };
    }

    const reward = (target - entry) * positionSize;
    // RRR can be recalculated or taken from input if mode is RRR-Based
    const rewardRiskRatio = (target - entry) / riskPerShare;
    const stopLossPercentCalc = ((sl - entry) / entry) * 100;
    const targetPercentCalc = ((target - entry) / entry) * 100;
    const exposurePercent = (investmentAmount / capital) * 100;

    return {
      mode,
      capital,
      riskAmount,
      entry,
      stopLoss: sl,
      target,
      riskPerShare,
      positionSize: Math.floor(positionSize),
      investmentAmount,
      reward,
      rewardRiskRatio,
      stopLossPercent: stopLossPercentCalc,
      targetPercent: targetPercentCalc,
      exposurePercent,
    };
  } catch (e) {
    console.error("Calculation Error:", e);
    return { error: "An unexpected error occurred during calculation." };
  }
}

// Helper to format currency
export const formatCurrency = (value: number, currencyCode: string): string => {
  if (isNaN(value)) return "N/A";
  try {
    return value.toLocaleString(undefined, {
      // Use undefined locale to let it pick system default or best match
      style: "currency",
      currency: currencyCode.toUpperCase(), // Ensure currency code is uppercase
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  } catch (error) {
    console.warn(`Failed to format currency for code ${currencyCode}:`, error);
    return `${value.toFixed(2)} ${currencyCode.toUpperCase()}`; // Fallback
  }
};

// Helper to format percentages
export const formatPercent = (value: number): string => {
  if (isNaN(value)) return "N/A";
  return `${value.toFixed(2)}%`;
};
