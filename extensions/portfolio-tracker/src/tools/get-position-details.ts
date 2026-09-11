/**
 * AI Tool: get-position-details
 *
 * Returns detailed information about a specific position identified by name
 * or symbol. Searches across all accounts and returns all matching positions
 * with their full details including units, currency, type, and any debt or
 * property metadata.
 *
 * The search is case-insensitive and supports partial matches on both the
 * display name and the Yahoo Finance symbol.
 */

import { loadPortfolioForTool, buildPortfolioSummary, ToolPositionSummary } from "./tool-data";
import { formatCurrency, formatPercent, formatUnits } from "../utils/formatting";

type Input = {
  /**
   * The name or symbol (or partial match) of the position to look up.
   * Matched case-insensitively against both the display name and the
   * Yahoo Finance symbol. If multiple positions match, all matches
   * are returned. Examples: "VUSA", "Apple", "S&P 500", "AAPL",
   * "mortgage", "credit card".
   */
  query: string;
};

/**
 * Retrieves detailed information about a specific position by name or symbol.
 *
 * Use this tool when the user asks about a specific holding, such as
 * "How many units of VUSA do I have?", "Tell me about my Apple shares",
 * "What's my mortgage position?", or "Show me details for AAPL".
 *
 * Searches across all accounts by both display name and Yahoo Finance symbol.
 * To get a list of all positions first, use the get-portfolio-summary tool.
 */
export default async function tool(input: Input) {
  const portfolio = await loadPortfolioForTool();

  if (!portfolio || portfolio.accounts.length === 0) {
    return "The user has no portfolio data yet. They need to add accounts and positions first using the Portfolio Tracker command.";
  }

  const searchTerm = input.query.toLowerCase().trim();

  if (!searchTerm) {
    return "No search query provided. Please specify a position name or symbol to look up.";
  }

  const summary = buildPortfolioSummary(portfolio);

  // Search across all accounts for matching positions
  const matches: Array<{ position: ToolPositionSummary; accountName: string; accountType: string }> = [];

  for (const account of summary.accounts) {
    for (const position of account.positions) {
      const nameMatch = position.name.toLowerCase().includes(searchTerm);
      const symbolMatch = position.symbol.toLowerCase().includes(searchTerm);
      const typeMatch = position.type.toLowerCase().includes(searchTerm);

      if (nameMatch || symbolMatch || typeMatch) {
        matches.push({
          position,
          accountName: account.name,
          accountType: account.type,
        });
      }
    }
  }

  if (matches.length === 0) {
    // Build a helpful list of all available positions
    const allPositions: string[] = [];
    for (const account of summary.accounts) {
      for (const position of account.positions) {
        allPositions.push(`${position.name} (${position.symbol}) in ${account.name}`);
      }
    }

    const positionList =
      allPositions.length > 0 ? `\n\nAvailable positions:\n${allPositions.map((p) => `  - ${p}`).join("\n")}` : "";

    return `No position found matching "${input.query}".${positionList}`;
  }

  const lines: string[] = [];

  if (matches.length === 1) {
    lines.push(`Position Details for "${matches[0].position.name}"`);
  } else {
    lines.push(`Found ${matches.length} positions matching "${input.query}"`);
  }
  lines.push("═".repeat(50));
  lines.push("");

  for (const match of matches) {
    const p = match.position;

    lines.push(`Name: ${p.name}`);
    lines.push(`Symbol: ${p.symbol}`);
    lines.push(`Type: ${p.type}`);
    lines.push(`Account: ${match.accountName} (${match.accountType})`);
    lines.push(`Currency: ${p.currency}`);
    lines.push(`Units: ${formatUnits(p.units)}`);

    if (p.priceOverride !== undefined && p.priceOverride > 0) {
      lines.push(`Price Override: ${formatCurrency(p.priceOverride, p.currency)}/unit`);
      lines.push(`Estimated Value (from override): ${formatCurrency(p.units * p.priceOverride, p.currency)}`);
    }

    // ── Debt-specific details ──

    if (p.isDebt) {
      lines.push("");
      lines.push("Debt Details:");

      if (p.debtBalance !== undefined) {
        lines.push(`  Outstanding Balance: ${formatCurrency(p.debtBalance, p.currency)}`);
      }
      if (p.debtApr !== undefined) {
        lines.push(`  APR: ${formatPercent(p.debtApr, { showSign: false })}`);
      }
      if (p.debtMonthlyRepayment !== undefined && p.debtMonthlyRepayment > 0) {
        lines.push(`  Monthly Repayment: ${formatCurrency(p.debtMonthlyRepayment, p.currency)}`);
        lines.push(`  Annual Repayment: ${formatCurrency(p.debtMonthlyRepayment * 12, p.currency)}`);
      }
      if (p.debtPaidOff) {
        lines.push("  Status: ✅ Paid Off");
      }
      if (p.debtArchived) {
        lines.push("  Status: 📦 Archived");
      }
      if (!p.debtPaidOff && !p.debtArchived) {
        lines.push("  Status: Active");
      }
    }

    // ── Property-specific details ──

    if (p.isProperty) {
      lines.push("");
      lines.push("Property Position:");
      lines.push(`  This is a property-type position. Full mortgage calculations`);
      lines.push(`  (equity, HPI appreciation, principal repayment) are available`);
      lines.push(`  in the Portfolio Tracker command under "Show Calculations".`);
    }

    // ── Check for duplicates across accounts ──

    const sameSymbolInOtherAccounts = matches.filter(
      (m) => m.position.symbol === p.symbol && m.accountName !== match.accountName,
    );

    if (sameSymbolInOtherAccounts.length > 0 && matches.length > 1) {
      lines.push("");
      lines.push(
        `Note: This symbol also appears in: ${sameSymbolInOtherAccounts.map((m) => m.accountName).join(", ")}`,
      );
    }

    lines.push("");
    lines.push("─".repeat(40));
    lines.push("");
  }

  // ── Aggregate stats if multiple matches ──

  if (matches.length > 1) {
    const totalUnits = matches.reduce((sum, m) => sum + m.position.units, 0);
    const uniqueSymbols = new Set(matches.map((m) => m.position.symbol));
    const uniqueAccounts = new Set(matches.map((m) => m.accountName));

    lines.push("Aggregate:");
    lines.push(`  Matches across ${uniqueAccounts.size} account(s)`);
    lines.push(`  Unique symbols: ${Array.from(uniqueSymbols).join(", ")}`);

    // Only show total units if all matches are the same symbol
    if (uniqueSymbols.size === 1) {
      lines.push(`  Total units (all accounts): ${formatUnits(totalUnits)}`);
    }
  }

  return lines.join("\n");
}
