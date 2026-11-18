/**
 * AI Tool: get-fire-projection
 *
 * Returns the user's current FIRE baseline: settings, contributions, projection
 * timeline, lump sum solver table, Coast FIRE analysis, and mathematical
 * reference — in that order, so the answer appears before the formulas.
 *
 * No inputs required — reads directly from persisted FIRE settings and
 * portfolio data to compute the projection.
 */

import { loadPortfolioForTool, loadFireSettingsForTool, buildFireSummary } from "./tool-data";
import { formatCurrency, formatPercent } from "../utils/formatting";

/**
 * Retrieves the user's FIRE projection, settings, contribution details,
 * Coast FIRE analysis, and lump sum solver.
 *
 * Use this tool ONLY for read-only questions about the current state:
 * - "When will I reach FIRE?"
 * - "What is my FIRE number?"
 * - "How much income will my FIRE number generate?"
 * - "Can I coast to FIRE if I stop contributing now?"
 * - "When can I start coasting if I want to retire at age 55?"
 * - "How much would I need to invest today to retire 3 years earlier?"
 *
 * Do NOT use this tool if the user mentions any change or hypothetical
 * ("if I add", "what if", "if I contributed more", "if growth drops") —
 * use simulate-fire-scenario instead.
 *
 * All formulas are appended at the end so the AI can answer follow-up
 * questions and verify calculations without re-fetching data.
 */
export default async function tool() {
  const settings = await loadFireSettingsForTool();

  if (!settings) {
    return "The user has not configured their FIRE settings yet. They need to set up the FIRE Dashboard first using the FIRE Dashboard command — this includes setting a target value, growth rate, inflation, withdrawal rate, year of birth, and contributions.";
  }

  const portfolio = await loadPortfolioForTool();
  const summary = await buildFireSummary(settings, portfolio);

  const currentYear = new Date().getFullYear();
  const realRate = summary.projection.realGrowthRate; // decimal, e.g. 0.045
  const realRatePct = realRate * 100;
  const P = summary.projection.currentPortfolioValue;
  const FN = summary.projection.targetValue;
  const C = summary.contributions.totalAnnual;
  const monthlyC = summary.contributions.totalMonthly;

  const lines: string[] = [];

  // ── FIRE Progress ───────────────────────────────────────────────────────────

  const progressPct = FN > 0 ? (P / FN) * 100 : 0;
  const gap = Math.max(0, FN - P);
  lines.push("FIRE PROGRESS:");
  lines.push(
    `  Progress to FIRE: ${progressPct.toFixed(1)}%  (${formatCurrency(P, "GBP")} of ${formatCurrency(FN, "GBP")})`,
  );
  lines.push(`  Remaining gap:    ${formatCurrency(gap, "GBP")}`);
  lines.push("");

  // ── Settings Overview ───────────────────────────────────────────────────────

  lines.push("FIRE SETTINGS:");
  lines.push(`  Target (FIRE Number):        ${formatCurrency(summary.settings.targetValue, "GBP")}`);
  lines.push(`  Withdrawal Rate:             ${formatPercent(summary.settings.withdrawalRate, { showSign: false })}`);
  lines.push(
    `  Annual Growth Rate (Nominal): ${formatPercent(summary.settings.annualGrowthRate, { showSign: false })}`,
  );
  lines.push(`  Annual Inflation:            ${formatPercent(summary.settings.annualInflation, { showSign: false })}`);
  lines.push(`  Real Growth Rate:            ${formatPercent(realRatePct, { showSign: false })}`);
  lines.push(`  Year of Birth:               ${summary.settings.yearOfBirth}`);
  lines.push(`  SIPP Access Age:             ${summary.settings.sippAccessAge}`);
  lines.push(`  Holiday Entitlement:         ${summary.settings.holidayEntitlement} days/year`);

  if (summary.settings.targetFireAge) {
    lines.push(`  Target FIRE Age:             ${summary.settings.targetFireAge}`);
  }
  if (summary.settings.targetFireYear) {
    lines.push(`  Target FIRE Year:            ${summary.settings.targetFireYear}`);
  }
  if (summary.settings.excludedAccountIds.length > 0) {
    lines.push(`  Excluded Accounts:           ${summary.settings.excludedAccountIds.length} account(s) excluded`);
  }
  lines.push("");

  // ── Contributions ───────────────────────────────────────────────────────────

  lines.push("CONTRIBUTIONS:");
  lines.push(`  Total Monthly:  ${formatCurrency(monthlyC, "GBP")}`);
  lines.push(`  Total Annual:   ${formatCurrency(C, "GBP")}`);

  if (summary.contributions.items.length > 0) {
    lines.push("  Breakdown:");
    for (const item of summary.contributions.items) {
      lines.push(
        `    - ${item.positionName} in ${item.accountName}: ${formatCurrency(item.monthlyAmount, "GBP")}/month`,
      );
    }
  } else {
    lines.push("  No contributions configured.");
  }
  lines.push("");

  // ── FIRE Projection ─────────────────────────────────────────────────────────

  lines.push("FIRE PROJECTION:");
  lines.push(`  Current Portfolio Value: ${formatCurrency(P, "GBP")}`);
  lines.push(`  Target Value:            ${formatCurrency(FN, "GBP")}`);

  if (summary.projection.targetHitInWindow) {
    lines.push(`  FIRE Year:               ${summary.projection.fireYear}`);
    lines.push(`  FIRE Age:                ${summary.projection.fireAge}`);
    if (summary.projection.daysToFire !== null) {
      lines.push(`  Calendar Days to FIRE:   ${summary.projection.daysToFire.toLocaleString()}`);
    }
    if (summary.projection.workingDaysToFire !== null) {
      lines.push(`  Working Days to FIRE:    ${summary.projection.workingDaysToFire.toLocaleString()}`);
    }
  } else {
    lines.push("  FIRE target is NOT reached within the projection window (30 years).");
    lines.push("  The user may need to increase contributions, reduce their target, or adjust growth assumptions.");
  }
  lines.push("");

  // ── Safe Withdrawal Income ──────────────────────────────────────────────────

  lines.push("SAFE WITHDRAWAL INCOME:");
  lines.push(
    `  At ${formatPercent(settings.withdrawalRate, { showSign: false })} withdrawal rate on ${formatCurrency(FN, "GBP")}:`,
  );
  lines.push(`    ${formatCurrency(FN * (settings.withdrawalRate / 100), "GBP")}/year`);
  lines.push(`    ${formatCurrency((FN * (settings.withdrawalRate / 100)) / 12, "GBP")}/month`);
  lines.push("");

  // ── Lump Sum Solver ──────────────────────────────────────────────────────────
  //
  // For a target FIRE year T, solve for the starting portfolio P_required such
  // that V(N) = FN after N = T - currentYear years:
  //
  //   V(N) = P × (1+r)^N  +  C × (1+r/2) × [(1+r)^N - 1] / r
  //   P_required = [ FN  -  C × (1+r/2) × ((1+r)^N - 1) / r ]  /  (1+r)^N
  //   Lump_Sum   = P_required - P_current

  if (summary.projection.targetHitInWindow && summary.projection.fireYear !== null && realRate > 0) {
    const baseFireYear = summary.projection.fireYear;
    const baseN = baseFireYear - currentYear;

    lines.push("LUMP SUM SOLVER — capital needed today to retire N years earlier:");
    lines.push(`  (keeping contributions at ${formatCurrency(monthlyC, "GBP")}/month unchanged)`);
    lines.push("");

    const maxEarlier = Math.min(5, baseN - 1);
    let anyValid = false;

    for (let yearsEarlier = 1; yearsEarlier <= maxEarlier; yearsEarlier++) {
      const targetYear = baseFireYear - yearsEarlier;
      const N = targetYear - currentYear;
      if (N <= 0) continue;

      const compoundFactor = Math.pow(1 + realRate, N);
      const contribFV = C > 0 ? (C * (1 + realRate / 2) * (compoundFactor - 1)) / realRate : C * N;
      const pRequired = (FN - contribFV) / compoundFactor;
      const lumpSum = pRequired - P;

      if (lumpSum <= 0) {
        lines.push(
          `  Retire ${yearsEarlier} year(s) earlier (${targetYear}, age ${targetYear - settings.yearOfBirth}): already on track — no lump sum needed.`,
        );
      } else {
        lines.push(
          `  Retire ${yearsEarlier} year(s) earlier (${targetYear}, age ${targetYear - settings.yearOfBirth}): invest ${formatCurrency(lumpSum, "GBP")} today`,
        );
      }
      anyValid = true;
    }

    if (!anyValid) {
      lines.push("  Not enough projection years to calculate earlier retirement scenarios.");
    }
    lines.push("");
  }

  // ── Coast FIRE Analysis ─────────────────────────────────────────────────────
  //
  // Q1: If the user stops contributing TODAY, when do they retire?
  //   n = log(FN / P) / log(1 + r)
  //
  // Q2: To retire at a target year T, when can they stop contributing?
  //   Required coast balance at year t = FN / (1 + r)^(T - currentYear - t)
  //   Find t = first year where V(n) with contributions >= required coast balance.

  lines.push("COAST FIRE ANALYSIS:");
  lines.push("─────────────────────");
  lines.push("Coast FIRE = the balance at which you can stop ALL contributions and still");
  lines.push("reach your FIRE Number through compound growth alone.");
  lines.push("");

  if (P <= 0 || FN <= 0 || realRate <= 0) {
    lines.push("  Cannot compute Coast FIRE: portfolio, FIRE Number, or real growth rate is zero.");
  } else {
    // ── Q1: Coast retirement age if stopping contributions now ──

    const nCoast = Math.log(FN / P) / Math.log(1 + realRate);
    const coastRetirementYear = currentYear + nCoast;
    const coastRetirementAge = Math.round(coastRetirementYear) - settings.yearOfBirth;

    lines.push("Q1 — If I stop contributing TODAY, when can I retire?");
    lines.push(`  n = log(FN / P) / log(1 + r)`);
    lines.push(
      `    = log(${formatCurrency(FN, "GBP")} / ${formatCurrency(P, "GBP")}) / log(1 + ${realRate.toFixed(6)})`,
    );
    lines.push(`    = ${nCoast.toFixed(2)} years from now`);
    lines.push(`  → Coast retirement year: ${Math.round(coastRetirementYear)}`);
    lines.push(`  → Coast retirement age:  ${coastRetirementAge}`);

    if (summary.projection.targetHitInWindow && summary.projection.fireYear !== null) {
      const yearsDiff = Math.round(coastRetirementYear) - summary.projection.fireYear;
      if (yearsDiff > 0) {
        lines.push(
          `  → This is ${yearsDiff} year(s) LATER than your FIRE year (${summary.projection.fireYear}) with contributions.`,
        );
        lines.push("    Coasting now trades contributions for a later retirement.");
      } else if (yearsDiff === 0) {
        lines.push("    Coasting now gives the same FIRE year — contributions have minimal impact.");
      } else {
        lines.push(`  → Remarkably, this is ${Math.abs(yearsDiff)} year(s) EARLIER than your projected FIRE year.`);
      }
    }
    lines.push("");

    // ── Q2: When to start coasting to hit a target retirement year ──

    const targetRetirementAge = summary.settings.targetFireAge ?? summary.projection.fireAge;
    const targetRetirementYear = targetRetirementAge
      ? settings.yearOfBirth + targetRetirementAge
      : summary.projection.fireYear;

    if (targetRetirementYear && targetRetirementYear > currentYear) {
      const yearsToTarget = targetRetirementYear - currentYear;
      const requiredCoastBalance = FN / Math.pow(1 + realRate, yearsToTarget);

      lines.push(
        `Q2 — When can I start coasting to retire at age ${targetRetirementAge ?? "projected"} (${targetRetirementYear})?`,
      );
      lines.push(`  Required Coast Balance = FN / (1 + r)^n`);
      lines.push(
        `    = ${formatCurrency(FN, "GBP")} / (1 + ${realRate.toFixed(6)})^${yearsToTarget} = ${formatCurrency(requiredCoastBalance, "GBP")}`,
      );
      lines.push("");

      if (P >= requiredCoastBalance) {
        lines.push("  ✅ YOU HAVE ALREADY REACHED COAST FIRE!");
        lines.push(
          `     Current portfolio ${formatCurrency(P, "GBP")} >= required ${formatCurrency(requiredCoastBalance, "GBP")}.`,
        );
        lines.push("     You can stop contributing today and still reach your target.");
      } else {
        let balance = P;
        let coastYear: number | null = null;
        let coastAge: number | null = null;

        for (let t = 1; t <= 30; t++) {
          const yearsRemainingAtT = targetRetirementYear - (currentYear + t);
          if (yearsRemainingAtT <= 0) break;
          const requiredAtT = FN / Math.pow(1 + realRate, yearsRemainingAtT);
          balance = balance * (1 + realRate) + C * (1 + realRate / 2);
          if (balance >= requiredAtT) {
            coastYear = currentYear + t;
            coastAge = coastYear - settings.yearOfBirth;
            break;
          }
        }

        if (coastYear !== null && coastAge !== null) {
          lines.push(`  → Start coasting in: ${coastYear} (at age ${coastAge})`);
          lines.push(`  → That is ${coastYear - currentYear} year(s) from now.`);
          if (summary.projection.targetHitInWindow && summary.projection.fireYear !== null) {
            const yearsFree = summary.projection.fireYear - coastYear;
            if (yearsFree > 0) {
              lines.push(`  → ${yearsFree} year(s) of coast mode before full FIRE.`);
            }
          }
        } else {
          lines.push("  → Coast start year not found within 30-year window.");
          lines.push("    Consider increasing contributions or adjusting retirement age.");
        }

        const coastGap = requiredCoastBalance - P;
        lines.push(`  Gap to Coast FIRE balance: ${formatCurrency(coastGap, "GBP")}`);
        lines.push(`  (${((P / requiredCoastBalance) * 100).toFixed(1)}% of the way there)`);
      }
      lines.push("");

      // ── Q2b: Quick reference table for common retirement ages ──

      lines.push("Q2b — Coast FIRE balance needed for common retirement ages:");
      lines.push("");

      const checkAges = [55, 57, 60, 65].filter(
        (a) => a > currentYear - settings.yearOfBirth && a !== targetRetirementAge,
      );

      for (const age of checkAges) {
        const year = settings.yearOfBirth + age;
        if (year <= currentYear) continue;
        const yrs = year - currentYear;
        const req = FN / Math.pow(1 + realRate, yrs);
        const achieved = P >= req;
        const pct = ((P / req) * 100).toFixed(1);
        lines.push(
          `  Retire at ${age} (${year}): need ${formatCurrency(req, "GBP")} — ${
            achieved ? "✅ already reached!" : `${pct}% there (gap: ${formatCurrency(req - P, "GBP")})`
          }`,
        );
      }
    } else {
      lines.push("Q2 — Skipped: target retirement year is not set or is in the past.");
    }
  }
  lines.push("");

  // ── Mathematical Reference (appended last — for AI follow-up calculations) ──

  lines.push("MATHEMATICAL REFERENCE:");
  lines.push("───────────────────────");
  lines.push("Current values:");
  lines.push(`  P  = ${formatCurrency(P, "GBP")}  (current portfolio)`);
  lines.push(`  FN = ${formatCurrency(FN, "GBP")}  (FIRE Number / target)`);
  lines.push(`  r  = ${realRate.toFixed(6)}  (real growth rate decimal)`);
  lines.push(`  C  = ${formatCurrency(C, "GBP")}/year  (${formatCurrency(monthlyC, "GBP")}/month × 12)`);
  lines.push(`  currentYear = ${currentYear},  yearOfBirth = ${settings.yearOfBirth}`);
  lines.push(
    `  nominalGrowthRate = ${formatPercent(settings.annualGrowthRate, { showSign: false })},  inflationRate = ${formatPercent(settings.annualInflation, { showSign: false })}`,
  );
  lines.push("");
  lines.push("Formulas:");
  lines.push("  r = (nominalGrowthRate - inflationRate) / 100");
  lines.push("  FN = annualSpending × (100 / withdrawalRate)");
  lines.push("  V(n) = V(n-1) × (1+r) + C × (1+r/2)                    [year-by-year growth]");
  lines.push("  n ≈ log((FN×r + C) / (P×r + C)) / log(1+r)             [time to FIRE approx]");
  lines.push("  n = log(FN / P) / log(1+r)                              [coast retirement, no contributions]");
  lines.push("  Coast_Balance = FN / (1+r)^yearsToRetirement            [coast FIRE number]");
  lines.push("  P_required = (FN - C×(1+r/2)×((1+r)^N-1)/r) / (1+r)^N [lump sum solver]");
  lines.push("  Lump_Sum = P_required - P                               [additional capital needed today]");
  lines.push("  annualIncome = FN × (withdrawalRate / 100)              [safe withdrawal income]");
  lines.push("");

  return lines.join("\n");
}
