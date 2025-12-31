import type { Params, Result } from "./types";

/**
 * Calculate compound interest with optional monthly contributions and after-tax calculation.
 * When monthly contributions are present, monthly compounding is automatically used.
 */
export function calcCompound(params: Params): Result {
  const { principal, monthly, ratePct, years, freq, afterTax, taxRatePct } = params;

  const R = ratePct / 100;

  if (monthly > 0) {
    return calcWithMonthly(principal, monthly, R, years, afterTax, taxRatePct);
  }

  return calcPrincipalOnly(principal, R, years, freq, afterTax, taxRatePct);
}

function calcPrincipalOnly(
  principal: number,
  R: number,
  years: number,
  freq: "yearly" | "monthly" | "daily",
  afterTax: boolean,
  taxRatePct: number,
): Result {
  const n =
    freq === "yearly"
      ? 1
      : freq === "monthly"
        ? 12
        : freq === "daily"
          ? 365
          : (() => {
              throw new Error(`Unknown freq: ${freq}`);
            })();

  // FV = P * (1 + R/n)^(n*t)
  const fvBeforeTax = principal * Math.pow(1 + R / n, n * years);

  const contrib = principal;
  const gain = fvBeforeTax - contrib;

  const fvAfterTax = afterTax ? fvBeforeTax - Math.max(gain, 0) * (taxRatePct / 100) : undefined;
  const tax = afterTax ? Math.max(gain, 0) * (taxRatePct / 100) : undefined;

  return {
    fvBeforeTax,
    fvAfterTax,
    contrib,
    gain,
    tax,
    months: Math.round(years * 12),
    monthlyRate: Math.pow(1 + R, 1 / 12) - 1,
  };
}

function calcWithMonthly(
  principal: number,
  monthly: number,
  R: number,
  years: number,
  afterTax: boolean,
  taxRatePct: number,
): Result {
  // Monthly rate using geometric mean: i = (1 + R)^(1/12) - 1
  const i = Math.pow(1 + R, 1 / 12) - 1;
  const N = Math.round(years * 12);

  // Future value of principal
  const fvPrincipal = principal > 0 ? principal * Math.pow(1 + i, N) : 0;

  // Future value of contributions (ordinary annuity formula)
  const fvMonthly = monthly > 0 ? (Math.abs(i) < 1e-10 ? monthly * N : monthly * ((Math.pow(1 + i, N) - 1) / i)) : 0;

  const fvBeforeTax = fvPrincipal + fvMonthly;
  const contrib = principal + monthly * N;
  const gain = fvBeforeTax - contrib;

  const fvAfterTax = afterTax ? fvBeforeTax - Math.max(gain, 0) * (taxRatePct / 100) : undefined;
  const tax = afterTax ? Math.max(gain, 0) * (taxRatePct / 100) : undefined;

  return {
    fvBeforeTax,
    fvAfterTax,
    contrib,
    gain,
    tax,
    months: N,
    monthlyRate: i,
  };
}
