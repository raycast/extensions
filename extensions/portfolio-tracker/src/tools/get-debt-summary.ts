/**
 * AI Tool: get-debt-summary
 *
 * Returns a focused summary of all debt positions across the portfolio,
 * including balances, APR, monthly repayments, and paid-off/archived status.
 * Useful for answering questions about total debt, repayment progress,
 * and debt-related insights.
 *
 * No inputs required — reads directly from persisted portfolio data.
 */

import { loadPortfolioForTool, buildPortfolioSummary, ToolPositionSummary } from "./tool-data";
import { formatCurrency, formatPercent } from "../utils/formatting";

/**
 * Retrieves a summary of all debt positions in the user's portfolio.
 *
 * Use this tool to answer questions like "How much debt do I have?",
 * "What are my monthly debt repayments?", "Which debts have the highest APR?",
 * "How much have I paid off?", "Show me my active debts", or
 * "What's my total debt balance?".
 *
 * Debts include credit cards, personal loans, student loans, auto loans,
 * and buy-now-pay-later positions. Their balances are subtracted from the
 * portfolio total to produce a net worth figure.
 */
export default async function tool() {
  const portfolio = await loadPortfolioForTool();

  if (!portfolio || portfolio.accounts.length === 0) {
    return "The user has no portfolio data yet. They need to add accounts and positions first using the Portfolio Tracker command.";
  }

  const summary = buildPortfolioSummary(portfolio);

  // Collect all debt positions across all accounts
  const debtPositions: Array<{ position: ToolPositionSummary; accountName: string }> = [];

  for (const account of summary.accounts) {
    for (const position of account.positions) {
      if (position.isDebt) {
        debtPositions.push({ position, accountName: account.name });
      }
    }
  }

  if (debtPositions.length === 0) {
    return "The user has no debt positions in their portfolio. Their net worth equals their total asset value with no debt offset.";
  }

  // ── Categorise debts ──

  const active: typeof debtPositions = [];
  const paidOff: typeof debtPositions = [];
  const archived: typeof debtPositions = [];

  for (const entry of debtPositions) {
    if (entry.position.debtArchived) {
      archived.push(entry);
    } else if (entry.position.debtPaidOff) {
      paidOff.push(entry);
    } else {
      active.push(entry);
    }
  }

  // ── Compute totals ──

  let totalActiveBalance = 0;
  let totalMonthlyRepayments = 0;

  for (const entry of active) {
    totalActiveBalance += entry.position.debtBalance ?? 0;
    totalMonthlyRepayments += entry.position.debtMonthlyRepayment ?? 0;
  }

  // ── Build response ──

  const lines: string[] = [];

  lines.push("Debt Summary");
  lines.push("============");
  lines.push("");
  lines.push(`Total Debt Positions: ${debtPositions.length}`);
  lines.push(`  Active: ${active.length}`);
  lines.push(`  Paid Off: ${paidOff.length}`);
  lines.push(`  Archived: ${archived.length}`);
  lines.push("");

  if (active.length > 0) {
    lines.push(`Total Active Debt Balance: ${formatCurrency(totalActiveBalance, "GBP")}`);
    lines.push(`Total Monthly Repayments: ${formatCurrency(totalMonthlyRepayments, "GBP")}`);
    lines.push(`Total Annual Repayments: ${formatCurrency(totalMonthlyRepayments * 12, "GBP")}`);
    lines.push("");
  }

  // ── Active debts detail ──

  if (active.length > 0) {
    lines.push("Active Debts:");
    lines.push("─────────────");

    // Sort by balance descending (highest balance first)
    const sorted = [...active].sort((a, b) => (b.position.debtBalance ?? 0) - (a.position.debtBalance ?? 0));

    for (const entry of sorted) {
      const p = entry.position;
      lines.push(`  ${p.name} (${p.type})`);
      lines.push(`    Account: ${entry.accountName}`);
      lines.push(`    Currency: ${p.currency}`);

      if (p.debtBalance !== undefined) {
        lines.push(`    Balance: ${formatCurrency(p.debtBalance, p.currency)}`);
      }
      if (p.debtApr !== undefined && p.debtApr > 0) {
        lines.push(`    APR: ${formatPercent(p.debtApr, { showSign: false })}`);
      }
      if (p.debtMonthlyRepayment !== undefined && p.debtMonthlyRepayment > 0) {
        lines.push(`    Monthly Repayment: ${formatCurrency(p.debtMonthlyRepayment, p.currency)}`);
      }
      lines.push("");
    }

    // ── APR ranking (if multiple active debts) ──

    if (active.length > 1) {
      const withApr = active
        .filter((e) => e.position.debtApr !== undefined && e.position.debtApr > 0)
        .sort((a, b) => (b.position.debtApr ?? 0) - (a.position.debtApr ?? 0));

      if (withApr.length > 1) {
        lines.push("Highest APR Debts (prioritise repayment of these):");
        for (const entry of withApr) {
          lines.push(
            `  ${entry.position.name}: ${formatPercent(entry.position.debtApr!, { showSign: false })} APR — ${formatCurrency(entry.position.debtBalance ?? 0, entry.position.currency)} balance`,
          );
        }
        lines.push("");
      }
    }
  }

  // ── Paid-off debts ──

  if (paidOff.length > 0) {
    lines.push("Paid Off Debts (not yet archived):");
    lines.push("──────────────────────────────────");
    for (const entry of paidOff) {
      lines.push(`  ${entry.position.name} (${entry.position.type}) in ${entry.accountName} — ✅ Paid Off`);
    }
    lines.push("");
  }

  // ── Archived debts ──

  if (archived.length > 0) {
    lines.push("Archived Debts:");
    lines.push("───────────────");
    for (const entry of archived) {
      lines.push(`  ${entry.position.name} (${entry.position.type}) in ${entry.accountName} — 📦 Archived`);
    }
    lines.push("");
  }

  return lines.join("\n");
}
