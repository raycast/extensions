/**
 * Search Investments command — standalone entry point.
 *
 * Renders the three-step SearchInvestmentsFlow:
 *   1. Search for an investment (no account pre-selected)
 *   2. Select (or create) an account
 *   3. Confirm asset details — name, units, optional price override
 *   4. Add position
 *
 * After a successful add the flow resets to step 1 automatically,
 * so the user can immediately add another investment without leaving
 * the command.
 *
 * All logic (portfolio mutations, account creation, price fetching)
 * lives in SearchInvestmentsFlow and its sub-components. This file
 * is intentionally a thin entry-point shim.
 */

import React from "react";
import { SearchInvestmentsFlow } from "./components/SearchInvestmentsFlow";

// ──────────────────────────────────────────
// Command Component
// ──────────────────────────────────────────

export default function SearchInvestmentsCommand(): React.JSX.Element {
  // No onDone supplied — after a successful add the flow resets to search
  // so the user can add another position without leaving the command.
  return <SearchInvestmentsFlow />;
}
