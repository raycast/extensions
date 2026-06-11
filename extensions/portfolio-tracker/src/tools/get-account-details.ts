/**
 * AI Tool: get-account-details
 *
 * Returns detailed information about a specific account identified by name.
 * Includes all positions within the account with their full details.
 *
 * The account name is matched case-insensitively and supports partial matches,
 * so the AI can pass user-provided names without requiring exact casing.
 */

import { loadPortfolioForTool, buildPortfolioSummary, formatAccountForAI } from "./tool-data";

type Input = {
  /**
   * The name (or partial name) of the account to look up.
   * Matched case-insensitively. If multiple accounts match,
   * all matches are returned. Examples: "ISA", "Vanguard ISA",
   * "brokerage", "property", "debt".
   */
  accountName: string;
};

/**
 * Retrieves detailed information about a specific portfolio account by name.
 *
 * Use this tool when the user asks about a specific account, such as
 * "What's in my ISA?", "Show me my brokerage account", or
 * "What positions do I have in my Vanguard account?".
 *
 * To get a list of all account names first, use the get-portfolio-summary tool.
 */
export default async function tool(input: Input) {
  const portfolio = await loadPortfolioForTool();

  if (!portfolio || portfolio.accounts.length === 0) {
    return "The user has no portfolio data yet. They need to add accounts and positions first using the Portfolio Tracker command.";
  }

  const searchTerm = input.accountName.toLowerCase().trim();

  if (!searchTerm) {
    return "No account name provided. Please specify an account name to look up.";
  }

  const matches = portfolio.accounts.filter((a) => a.name.toLowerCase().includes(searchTerm));

  if (matches.length === 0) {
    const allNames = portfolio.accounts.map((a) => a.name).join(", ");
    return `No account found matching "${input.accountName}". Available accounts: ${allNames}`;
  }

  const summary = buildPortfolioSummary(portfolio);
  const lines: string[] = [];

  for (const account of matches) {
    const accountSummary = summary.accounts.find((a) => a.id === account.id);
    if (!accountSummary) continue;

    lines.push(formatAccountForAI(accountSummary));
    lines.push("");

    if (accountSummary.positions.length === 0) {
      lines.push("  This account has no positions.");
    } else {
      lines.push(`  Total positions: ${accountSummary.positionCount}`);

      const currencies = new Set(accountSummary.positions.map((p) => p.currency));
      lines.push(`  Currencies: ${Array.from(currencies).join(", ")}`);

      const debtCount = accountSummary.positions.filter((p) => p.isDebt).length;
      if (debtCount > 0) {
        lines.push(`  Debt positions: ${debtCount}`);
      }

      const propertyCount = accountSummary.positions.filter((p) => p.isProperty).length;
      if (propertyCount > 0) {
        lines.push(`  Property positions: ${propertyCount}`);
      }
    }

    lines.push("");
  }

  if (matches.length > 1) {
    lines.unshift(`Found ${matches.length} accounts matching "${input.accountName}":\n`);
  }

  return lines.join("\n");
}
