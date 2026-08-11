/**
 * AI Tool: get-portfolio-summary
 *
 * Returns a structured overview of the user's portfolio including all accounts,
 * positions, asset allocation breakdown, and currencies held. This is the primary
 * tool for answering questions about portfolio composition and holdings.
 *
 * No inputs required — reads directly from persisted portfolio data.
 */

import { loadPortfolioForTool, buildPortfolioSummary, formatAccountForAI } from "./tool-data";

/**
 * Retrieves a complete summary of the user's investment portfolio.
 *
 * Returns all accounts with their positions, asset type allocation,
 * currencies held, and position counts. Use this tool to answer questions
 * like "What's in my portfolio?", "How many accounts do I have?",
 * "What's my asset allocation?", or "Show me my holdings".
 */
export default async function tool() {
  const portfolio = await loadPortfolioForTool();

  if (!portfolio || portfolio.accounts.length === 0) {
    return "The user has no portfolio data yet. They need to add accounts and positions first using the Portfolio Tracker command.";
  }

  const summary = buildPortfolioSummary(portfolio);

  const lines: string[] = [];

  lines.push(`Portfolio Overview: ${summary.totalAccounts} account(s), ${summary.totalPositions} position(s)`);
  lines.push(`Currencies held: ${summary.currencies.join(", ")}`);
  lines.push(`Last updated: ${summary.lastUpdated}`);
  lines.push("");

  lines.push("Asset Allocation:");
  for (const [type, data] of Object.entries(summary.assetAllocation)) {
    lines.push(`  ${type}: ${data.count} position(s) — ${data.symbols.join(", ")}`);
  }
  lines.push("");

  lines.push("Accounts & Holdings:");
  for (const account of summary.accounts) {
    lines.push(formatAccountForAI(account));
    lines.push("");
  }

  return lines.join("\n");
}
