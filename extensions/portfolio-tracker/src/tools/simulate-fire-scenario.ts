/**
 * AI Tool: simulate-fire-scenario
 *
 * Runs a custom FIRE projection with user-specified overrides for what-if
 * analysis. The user's current FIRE settings are used as the baseline, and
 * any provided overrides are applied on top before running the projection.
 *
 * This enables natural-language questions like:
 * - "What if I increase my contributions by £200/month?"
 * - "What if inflation rises to 4%?"
 * - "What if my growth rate drops to 5%?"
 * - "What if I change my FIRE target to £800,000?"
 * - "What happens if I start with £300,000 and contribute £2,000/month at 6% growth?"
 * - "What if I coast to FIRE from age 45?"
 * - "What if I retire at 55 — what contributions do I need?"
 *
 * The output includes the mathematical formulas used so the AI can verify
 * and extend calculations without re-fetching data.
 */

import { loadFireSettingsForTool, loadPortfolioForTool, computePortfolioValue } from "./tool-data";
import { calculateProjection, totalAnnualContribution } from "../services/fire-calculator";
import { formatCurrency, formatPercent } from "../utils/formatting";

type Input = {
  /**
   * Override for the starting portfolio value in the user's base currency.
   * If not provided, the current FIRE settings' computed portfolio value is used.
   * Example: 300000
   */
  currentPortfolioValue?: number;

  /**
   * Override for the FIRE target value (the "FIRE number") in the user's base currency.
   * If not provided, the user's configured target is used.
   * Example: 1000000
   */
  targetValue?: number;

  /**
   * Override for the nominal annual growth rate as a percentage.
   * If not provided, the user's configured rate is used.
   * Example: 8 means 8% annual growth
   */
  annualGrowthRate?: number;

  /**
   * Override for the annual inflation rate as a percentage.
   * If not provided, the user's configured rate is used.
   * Example: 3 means 3% inflation
   */
  annualInflation?: number;

  /**
   * Override for the total monthly contribution amount in the user's base currency.
   * When provided, this replaces the sum of all individual contributions.
   * If not provided, the total from the user's configured contributions is used.
   * Example: 2000 means £2,000/month total contributions
   */
  monthlyContribution?: number;

  /**
   * An amount to ADD to the current monthly contribution total.
   * Mutually exclusive with monthlyContribution — if both are provided,
   * monthlyContribution takes precedence.
   * Example: 200 means add £200/month on top of current contributions
   */
  additionalMonthlyContribution?: number;

  /**
   * Override for the user's year of birth.
   * If not provided, the user's configured year is used.
   * Example: 1990
   */
  yearOfBirth?: number;

  /**
   * Override for the withdrawal rate as a percentage.
   * Used in the response to contextualise the scenario but does not
   * change the projection calculation (projection targets the FIRE number).
   * Example: 3.5 means 3.5% withdrawal rate
   */
  withdrawalRate?: number;

  /**
   * Simulate a Coast FIRE scenario: the user stops ALL contributions at this
   * age and lets the portfolio grow passively to the FIRE number.
   * If provided, the scenario will compute when (year + age) the user can
   * retire under coast conditions, instead of the standard projection.
   * Example: 45 means "what if I stop contributing at age 45?"
   */
  coastFromAge?: number;

  /**
   * Target retirement age for a Coast FIRE "when can I start coasting?" query.
   * When provided alongside normal scenario parameters, the output will
   * calculate the required Coast FIRE balance and the year at which the
   * user's projected portfolio (with contributions) reaches that balance.
   * Example: 55 means "when can I start coasting to retire at 55?"
   */
  targetRetirementAge?: number;
};

/**
 * Simulates a FIRE projection with custom parameters for what-if analysis.
 *
 * Use this tool when the user asks hypothetical questions about their FIRE
 * journey, such as:
 * - "What if I increase contributions by £200/month?"
 * - "What if growth drops to 5%?"
 * - "What if I target £800k instead?"
 * - "How long if I start with £300k and save £2k/month at 6% growth?"
 * - "What if I stop contributing at age 45 and coast?" → use coastFromAge: 45
 * - "When can I start coasting to retire at 55?" → use targetRetirementAge: 55
 *
 * The tool loads the user's current FIRE settings as a baseline, applies
 * any overrides from the input, and runs a new projection. Both the
 * baseline and scenario results are returned for comparison, along with
 * the mathematical formulas used so the AI can extend or verify results.
 *
 * To get the user's current FIRE settings and projection first, use
 * the get-fire-projection tool.
 */
export default async function tool(input: Input) {
  const settings = await loadFireSettingsForTool();

  if (!settings) {
    return "The user has not configured their FIRE settings yet. They need to set up the FIRE Dashboard first using the FIRE Dashboard command. Once configured, you can run what-if scenarios against their settings.";
  }

  // ── Compute real portfolio value from cached prices ──

  const portfolio = await loadPortfolioForTool();
  const computedPortfolioValue = portfolio ? await computePortfolioValue(portfolio, settings.excludedAccountIds) : 0;

  // ── Build baseline values ──

  const baselineAnnualContrib = totalAnnualContribution(settings.contributions);
  const baselineMonthly = baselineAnnualContrib / 12;

  const baselinePortfolioValue = computedPortfolioValue;
  const baselineTargetValue = settings.targetValue;
  const baselineGrowthRate = settings.annualGrowthRate;
  const baselineInflation = settings.annualInflation;
  const baselineYearOfBirth = settings.yearOfBirth;
  const baselineWithdrawalRate = settings.withdrawalRate;

  // ── Apply overrides for scenario ──
  // Coerce all numeric inputs to Number — some models serialize numbers as
  // strings (e.g. "4000" instead of 4000), which would produce NaN downstream.

  const toNum = (v: number | string | undefined): number | undefined =>
    v !== undefined && v !== null ? Number(v) : undefined;

  const overridePortfolioValue = toNum(input.currentPortfolioValue);
  const overrideTargetValue = toNum(input.targetValue);
  const overrideGrowthRate = toNum(input.annualGrowthRate);
  const overrideInflation = toNum(input.annualInflation);
  const overrideYearOfBirth = toNum(input.yearOfBirth);
  const overrideWithdrawalRate = toNum(input.withdrawalRate);
  const overrideMonthlyContribution = toNum(input.monthlyContribution);
  const overrideAdditionalMonthly = toNum(input.additionalMonthlyContribution);
  const overrideCoastFromAge = toNum(input.coastFromAge);
  const overrideTargetRetirementAge = toNum(input.targetRetirementAge);

  const scenarioPortfolioValue = overridePortfolioValue ?? baselinePortfolioValue;
  const scenarioTargetValue = overrideTargetValue ?? baselineTargetValue;
  const scenarioGrowthRate = overrideGrowthRate ?? baselineGrowthRate;
  const scenarioInflation = overrideInflation ?? baselineInflation;
  const scenarioYearOfBirth = overrideYearOfBirth ?? baselineYearOfBirth;
  const scenarioWithdrawalRate = overrideWithdrawalRate ?? baselineWithdrawalRate;

  let scenarioMonthly: number;
  if (overrideMonthlyContribution !== undefined) {
    scenarioMonthly = overrideMonthlyContribution;
  } else if (overrideAdditionalMonthly !== undefined) {
    scenarioMonthly = baselineMonthly + overrideAdditionalMonthly;
  } else {
    scenarioMonthly = baselineMonthly;
  }
  const scenarioAnnualContrib = scenarioMonthly * 12;

  // ── Run baseline projection ──

  const baselineProjection = calculateProjection({
    currentPortfolioValue: baselinePortfolioValue,
    targetValue: baselineTargetValue,
    annualGrowthRate: baselineGrowthRate,
    annualInflation: baselineInflation,
    annualContribution: baselineAnnualContrib,
    yearOfBirth: baselineYearOfBirth,
    sippAccessAge: settings.sippAccessAge,
    holidayEntitlement: settings.holidayEntitlement,
  });

  // ── Run scenario projection ──

  const scenarioProjection = calculateProjection({
    currentPortfolioValue: scenarioPortfolioValue,
    targetValue: scenarioTargetValue,
    annualGrowthRate: scenarioGrowthRate,
    annualInflation: scenarioInflation,
    annualContribution: scenarioAnnualContrib,
    yearOfBirth: scenarioYearOfBirth,
    sippAccessAge: settings.sippAccessAge,
    holidayEntitlement: settings.holidayEntitlement,
  });

  // ── Coast FIRE scenario calculations ──

  const currentYear = new Date().getFullYear();
  const scenarioRealRate = (scenarioGrowthRate - scenarioInflation) / 100;

  const coastAnalysis: string[] = [];

  if (overrideCoastFromAge !== undefined) {
    // Q: "What if I stop contributing at age X?"
    const coastStartYear = settings.yearOfBirth + overrideCoastFromAge;
    const yearsToCoastStart = coastStartYear - currentYear;

    if (yearsToCoastStart <= 0) {
      coastAnalysis.push(
        `  Note: coastFromAge ${overrideCoastFromAge} is in the past — showing result if coasting started today.`,
      );
    }

    // Project portfolio with contributions up to coast start year
    let balanceAtCoast = scenarioPortfolioValue;
    const yearsContributing = Math.max(0, yearsToCoastStart);
    for (let t = 0; t < yearsContributing; t++) {
      balanceAtCoast = balanceAtCoast * (1 + scenarioRealRate) + scenarioAnnualContrib * (1 + scenarioRealRate / 2);
    }

    // From coast start, grow with zero contributions
    const nCoastToFire =
      scenarioRealRate > 0 && balanceAtCoast > 0
        ? Math.log(scenarioTargetValue / balanceAtCoast) / Math.log(1 + scenarioRealRate)
        : Infinity;

    const coastFireYear = Math.round(coastStartYear + nCoastToFire);
    const coastFireAge = coastFireYear - settings.yearOfBirth;

    coastAnalysis.push("");
    coastAnalysis.push("COAST FIRE SCENARIO:");
    coastAnalysis.push(`  Stop contributing at age: ${overrideCoastFromAge} (year ${coastStartYear})`);
    coastAnalysis.push(`  Portfolio at coast start: ${formatCurrency(balanceAtCoast, "GBP")}`);
    coastAnalysis.push(`  Formula: n = log(FN / V_coast) / log(1 + r)`);
    coastAnalysis.push(
      `           n = log(${formatCurrency(scenarioTargetValue, "GBP")} / ${formatCurrency(balanceAtCoast, "GBP")}) / log(1 + ${scenarioRealRate.toFixed(6)})`,
    );
    coastAnalysis.push(
      `           n = ${isFinite(nCoastToFire) ? nCoastToFire.toFixed(2) : "∞"} years from coast start`,
    );
    if (isFinite(coastFireYear) && coastFireAge < 120) {
      coastAnalysis.push(`  → Coast FIRE year: ${coastFireYear}`);
      coastAnalysis.push(`  → Coast FIRE age:  ${coastFireAge}`);
    } else {
      coastAnalysis.push("  → Portfolio does not reach FIRE Number from coast balance — consider a later coast age.");
    }
  }

  if (overrideTargetRetirementAge !== undefined) {
    // Q: "When can I start coasting to retire at age X?"
    const targetRetirementYear = settings.yearOfBirth + overrideTargetRetirementAge;
    const yearsToTarget = targetRetirementYear - currentYear;

    if (yearsToTarget <= 0) {
      coastAnalysis.push(`  Note: targetRetirementAge ${overrideTargetRetirementAge} is in the past or current year.`);
    } else {
      const requiredCoastBalance = scenarioTargetValue / Math.pow(1 + scenarioRealRate, yearsToTarget);

      coastAnalysis.push("");
      coastAnalysis.push(
        `COAST FIRE — WHEN CAN I START COASTING TO RETIRE AT AGE ${overrideTargetRetirementAge} (${targetRetirementYear})?`,
      );
      coastAnalysis.push(`  Formula: Required_Coast_Balance = FN / (1 + r)^n`);
      coastAnalysis.push(
        `           = ${formatCurrency(scenarioTargetValue, "GBP")} / (1 + ${scenarioRealRate.toFixed(6)})^${yearsToTarget}`,
      );
      coastAnalysis.push(`           = ${formatCurrency(requiredCoastBalance, "GBP")}`);
      coastAnalysis.push("");

      if (scenarioPortfolioValue >= requiredCoastBalance) {
        coastAnalysis.push("  ✅ Already at Coast FIRE for this target!");
        coastAnalysis.push(
          `     Current portfolio (${formatCurrency(scenarioPortfolioValue, "GBP")}) ≥ required (${formatCurrency(requiredCoastBalance, "GBP")}).`,
        );
        coastAnalysis.push("     You can stop contributing now and still reach your target.");
      } else {
        // Find the year where accumulated balance (with contributions) hits the required coast balance
        let balance = scenarioPortfolioValue;
        let coastYear: number | null = null;
        let coastAge: number | null = null;

        for (let t = 1; t <= 30; t++) {
          const yearsRemainingAtT = targetRetirementYear - (currentYear + t);
          if (yearsRemainingAtT <= 0) break;
          const requiredAtT = scenarioTargetValue / Math.pow(1 + scenarioRealRate, yearsRemainingAtT);
          balance = balance * (1 + scenarioRealRate) + scenarioAnnualContrib * (1 + scenarioRealRate / 2);
          if (balance >= requiredAtT) {
            coastYear = currentYear + t;
            coastAge = coastYear - settings.yearOfBirth;
            break;
          }
        }

        if (coastYear !== null && coastAge !== null) {
          coastAnalysis.push(`  → Start coasting in: ${coastYear} (at age ${coastAge})`);
          coastAnalysis.push(`  → That is ${coastYear - currentYear} year(s) from now.`);
          coastAnalysis.push(`  → Portfolio needed by then: ${formatCurrency(requiredCoastBalance, "GBP")}`);
          const coastGapPct = ((scenarioPortfolioValue / requiredCoastBalance) * 100).toFixed(1);
          coastAnalysis.push(
            `  Current progress to Coast FIRE: ${coastGapPct}% (gap: ${formatCurrency(requiredCoastBalance - scenarioPortfolioValue, "GBP")})`,
          );
        } else {
          coastAnalysis.push("  → Could not determine coast start year within 30-year window.");
          coastAnalysis.push(`     You may need higher contributions or a later retirement age target.`);
        }
      }
    }
  }

  // ── Format response ──

  const lines: string[] = [];

  lines.push("FIRE What-If Scenario Comparison");
  lines.push("================================");
  lines.push("");

  // ── Describe what changed ──

  const changes: string[] = [];
  if (input.currentPortfolioValue !== undefined) {
    changes.push(
      `Starting Portfolio: ${formatCurrency(baselinePortfolioValue, "GBP")} → ${formatCurrency(scenarioPortfolioValue, "GBP")}`,
    );
  }
  if (input.targetValue !== undefined) {
    changes.push(
      `FIRE Target: ${formatCurrency(baselineTargetValue, "GBP")} → ${formatCurrency(scenarioTargetValue, "GBP")}`,
    );
  }
  if (input.annualGrowthRate !== undefined) {
    changes.push(
      `Growth Rate: ${formatPercent(baselineGrowthRate, { showSign: false })} → ${formatPercent(scenarioGrowthRate, { showSign: false })}`,
    );
  }
  if (input.annualInflation !== undefined) {
    changes.push(
      `Inflation: ${formatPercent(baselineInflation, { showSign: false })} → ${formatPercent(scenarioInflation, { showSign: false })}`,
    );
  }
  if (input.monthlyContribution !== undefined || input.additionalMonthlyContribution !== undefined) {
    changes.push(
      `Monthly Contributions: ${formatCurrency(baselineMonthly, "GBP")} → ${formatCurrency(scenarioMonthly, "GBP")}`,
    );
  }
  if (input.withdrawalRate !== undefined) {
    changes.push(
      `Withdrawal Rate: ${formatPercent(baselineWithdrawalRate, { showSign: false })} → ${formatPercent(scenarioWithdrawalRate, { showSign: false })}`,
    );
  }
  if (input.yearOfBirth !== undefined) {
    changes.push(`Year of Birth: ${baselineYearOfBirth} → ${scenarioYearOfBirth}`);
  }
  if (overrideCoastFromAge !== undefined) {
    changes.push(`Coast Mode: stop contributing at age ${overrideCoastFromAge}`);
  }
  if (overrideTargetRetirementAge !== undefined) {
    changes.push(`Target Retirement Age: ${overrideTargetRetirementAge} (Coast FIRE analysis)`);
  }

  if (changes.length > 0) {
    lines.push("Changes Applied:");
    for (const change of changes) {
      lines.push(`  • ${change}`);
    }
  } else {
    lines.push("No overrides applied — this is the same as the baseline projection.");
  }

  lines.push("");

  // ── Baseline Results ──

  lines.push("Baseline (Current Settings):");
  lines.push(`  Monthly Contributions: ${formatCurrency(baselineMonthly, "GBP")}`);
  lines.push(`  Annual Contributions: ${formatCurrency(baselineAnnualContrib, "GBP")}`);
  lines.push(`  Real Growth Rate: ${formatPercent(baselineProjection.realGrowthRate * 100, { showSign: false })}`);

  if (baselineProjection.targetHitInWindow) {
    lines.push(`  FIRE Year: ${baselineProjection.fireYear}`);
    lines.push(`  FIRE Age: ${baselineProjection.fireAge}`);
    if (baselineProjection.daysToFire !== null) {
      lines.push(`  Days to FIRE: ${baselineProjection.daysToFire.toLocaleString()}`);
    }
    if (baselineProjection.workingDaysToFire !== null) {
      lines.push(`  Working Days to FIRE: ${baselineProjection.workingDaysToFire.toLocaleString()}`);
    }
  } else {
    lines.push("  FIRE target NOT reached within 30-year projection window.");
  }

  lines.push("");

  // ── Scenario Results ──

  lines.push("Scenario (With Changes):");
  lines.push(`  Monthly Contributions: ${formatCurrency(scenarioMonthly, "GBP")}`);
  lines.push(`  Annual Contributions: ${formatCurrency(scenarioAnnualContrib, "GBP")}`);
  lines.push(`  Real Growth Rate: ${formatPercent(scenarioProjection.realGrowthRate * 100, { showSign: false })}`);

  if (scenarioProjection.targetHitInWindow) {
    lines.push(`  FIRE Year: ${scenarioProjection.fireYear}`);
    lines.push(`  FIRE Age: ${scenarioProjection.fireAge}`);
    if (scenarioProjection.daysToFire !== null) {
      lines.push(`  Days to FIRE: ${scenarioProjection.daysToFire.toLocaleString()}`);
    }
    if (scenarioProjection.workingDaysToFire !== null) {
      lines.push(`  Working Days to FIRE: ${scenarioProjection.workingDaysToFire.toLocaleString()}`);
    }
  } else {
    lines.push("  FIRE target NOT reached within 30-year projection window.");
  }

  lines.push("");

  // ── Comparison ──

  lines.push("Impact:");

  if (baselineProjection.targetHitInWindow && scenarioProjection.targetHitInWindow) {
    const yearDiff = scenarioProjection.fireYear! - baselineProjection.fireYear!;

    if (yearDiff === 0) {
      lines.push("  No change in FIRE timeline — target is reached in the same year.");
    } else if (yearDiff < 0) {
      lines.push(
        `  FIRE reached ${Math.abs(yearDiff)} year(s) EARLIER (age ${scenarioProjection.fireAge} vs ${baselineProjection.fireAge}).`,
      );
    } else {
      lines.push(
        `  FIRE reached ${yearDiff} year(s) LATER (age ${scenarioProjection.fireAge} vs ${baselineProjection.fireAge}).`,
      );
    }

    if (baselineProjection.daysToFire !== null && scenarioProjection.daysToFire !== null) {
      const daysDiff = scenarioProjection.daysToFire - baselineProjection.daysToFire;
      if (daysDiff !== 0) {
        const direction = daysDiff < 0 ? "fewer" : "more";
        lines.push(`  ${Math.abs(daysDiff).toLocaleString()} ${direction} calendar days to FIRE.`);
      }
    }

    // ── Lump sum equivalent ──
    // When the scenario changes the FIRE year, answer the natural follow-up:
    // "how much would I need to invest today to get the same result without
    // changing contributions?" — solved using Formula 10 (closed form).
    //
    // We show lump sums for BOTH directions:
    //   - Scenario is EARLIER: how much to reach the scenario year from baseline contributions?
    //   - Scenario is LATER:   how much to recover back to the baseline year?
    //
    // Using scenario rate and scenario contributions as the active parameters.

    if (yearDiff !== 0 && scenarioRealRate > 0) {
      const currentYear = new Date().getFullYear();

      const computeLumpSum = (targetYear: number, currentPortfolio: number, annualContrib: number): number => {
        const N = targetYear - currentYear;
        if (N <= 0) return 0;
        const compoundFactor = Math.pow(1 + scenarioRealRate, N);
        const contribFV =
          annualContrib > 0 && scenarioRealRate > 0
            ? (annualContrib * (1 + scenarioRealRate / 2) * (compoundFactor - 1)) / scenarioRealRate
            : annualContrib * N;
        const pRequired = (scenarioTargetValue - contribFV) / compoundFactor;
        return pRequired - currentPortfolio;
      };

      lines.push("");
      lines.push("Lump Sum Equivalent (reach the same result without changing contributions):");

      if (yearDiff < 0) {
        // Scenario is earlier — how much lump sum from BASELINE contributions to hit scenario year?
        const lumpToMatchScenario = computeLumpSum(
          scenarioProjection.fireYear!,
          baselinePortfolioValue,
          baselineAnnualContrib,
        );
        if (lumpToMatchScenario > 0) {
          lines.push(
            `  To retire in ${scenarioProjection.fireYear} (age ${scenarioProjection.fireAge}) without changing contributions:`,
          );
          lines.push(`    invest ${formatCurrency(lumpToMatchScenario, "GBP")} as a lump sum today.`);
          lines.push(
            `  Formula: P_required = (FN - C×(1+r/2)×((1+r)^N-1)/r) / (1+r)^N  where N=${scenarioProjection.fireYear! - currentYear}`,
          );
        } else {
          lines.push(`  No lump sum needed — already on track to retire by ${scenarioProjection.fireYear}.`);
        }
      } else {
        // Scenario is later — how much lump sum from SCENARIO contributions to recover baseline year?
        const lumpToRecoverBaseline = computeLumpSum(
          baselineProjection.fireYear!,
          scenarioPortfolioValue,
          scenarioAnnualContrib,
        );
        if (lumpToRecoverBaseline > 0) {
          lines.push(
            `  To still retire in ${baselineProjection.fireYear} (age ${baselineProjection.fireAge}) despite this scenario:`,
          );
          lines.push(`    invest ${formatCurrency(lumpToRecoverBaseline, "GBP")} as a lump sum today.`);
          lines.push(
            `  Formula: P_required = (FN - C×(1+r/2)×((1+r)^N-1)/r) / (1+r)^N  where N=${baselineProjection.fireYear! - currentYear}`,
          );
        } else {
          lines.push(`  No lump sum needed — still on track for ${baselineProjection.fireYear} under this scenario.`);
        }
      }
    }
  } else if (!baselineProjection.targetHitInWindow && scenarioProjection.targetHitInWindow) {
    lines.push(
      `  The scenario ENABLES reaching FIRE (in ${scenarioProjection.fireYear}, age ${scenarioProjection.fireAge}) — the baseline did not reach it within 30 years.`,
    );
  } else if (baselineProjection.targetHitInWindow && !scenarioProjection.targetHitInWindow) {
    lines.push(
      "  The scenario PREVENTS reaching FIRE within the 30-year projection window — the baseline did reach it.",
    );
  } else {
    lines.push("  Neither the baseline nor the scenario reaches FIRE within 30 years.");
  }

  // ── Coast FIRE analysis (appended after answer) ──

  if (coastAnalysis.length > 0) {
    lines.push("");
    for (const line of coastAnalysis) {
      lines.push(line);
    }
  }

  // ── Mathematical formulas reference (appended last) ──

  lines.push("");
  lines.push("FORMULAS USED:");
  lines.push(
    `  Real rate: r = (nominalGrowth - inflation) / 100 = (${scenarioGrowthRate} - ${scenarioInflation}) / 100 = ${scenarioRealRate.toFixed(6)}`,
  );
  lines.push("  Year-by-year: V(n) = V(n-1) × (1 + r) + C × (1 + r/2)");
  lines.push(`    where C = annual contribution = ${formatCurrency(scenarioAnnualContrib, "GBP")}/year`);
  lines.push("  Coast FIRE balance: Coast_Balance = FN / (1 + r)^yearsToRetirement");
  lines.push("  Lump sum to reach FIRE year T (without changing contributions):");
  lines.push("    N = T - currentYear");
  lines.push("    compoundFactor = (1 + r)^N");
  lines.push("    contribFV = C × (1 + r/2) × (compoundFactor - 1) / r");
  lines.push("    P_required = (FN - contribFV) / compoundFactor");
  lines.push("    Lump_Sum = P_required - P_current");

  return lines.join("\n");
}
