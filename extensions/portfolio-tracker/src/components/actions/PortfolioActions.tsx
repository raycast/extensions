/**
 * PortfolioActions component.
 *
 * Top-level action panel displayed when the user is in the portfolio overview.
 * Provides actions that apply to the portfolio as a whole, such as adding
 * a new account, refreshing all prices, or toggling the detail panel.
 *
 * These actions are rendered at the top of the ActionPanel in the portfolio
 * list view, above any account-specific or position-specific actions.
 *
 * Usage:
 * ```tsx
 * <ActionPanel>
 *   <PortfolioActions
 *     onAddAccount={() => push(<AccountForm onSubmit={...} />)}
 *     onRefresh={() => refresh()}
 *     toggleDetailAction={<Action ... />}
 *   />
 * </ActionPanel>
 * ```
 */

import React from "react";
import { Action, ActionPanel, Icon } from "@raycast/api";

// ──────────────────────────────────────────
// Props
// ──────────────────────────────────────────

interface PortfolioActionsProps {
  /** Callback to navigate to the "Add Account" form */
  onAddAccount: () => void;

  /** Callback to refresh all prices and FX rates */
  onRefresh: () => void;

  /**
   * Callback to navigate to the "Search Investments" view.
   * Only shown when there is at least one account to add positions to.
   */
  onSearchInvestments?: () => void;

  /**
   * Callback to navigate to the Import/Export view.
   * Allows CSV backup and restore from within the Portfolio Tracker command.
   */
  onImportExport?: () => void;

  /**
   * Pre-built Action element that toggles the detail panel on/off.
   * Passed from the parent so the toggle state is managed in one place.
   * Rendered inside the "View" section.
   */
  toggleDetailAction?: React.JSX.Element;
}

// ──────────────────────────────────────────
// Component
// ──────────────────────────────────────────

/**
 * Top-level portfolio actions rendered in an ActionPanel.Section.
 *
 * Actions:
 * 1. Add Account — navigates to the AccountForm in create mode
 * 2. Search Investments — navigates to the search view (if accounts exist)
 * 3. Refresh Prices — re-fetches all prices and FX rates, clearing daily cache
 * 4. Import / Export Portfolio — navigates to CSV import/export view
 * 5. Toggle Detail Panel — shows/hides the split-pane detail view (⌘D)
 *
 * Keyboard shortcuts:
 * - ⌘N → Add Account
 * - ⌘F → Search Investments
 * - ⌘R → Refresh Prices
 * - ⌘⇧I → Import / Export Portfolio
 * - ⌘D → Toggle Detail Panel (handled by the passed-in action element)
 */
export function PortfolioActions({
  onAddAccount,
  onRefresh,
  onSearchInvestments,
  onImportExport,
  toggleDetailAction,
}: PortfolioActionsProps): React.JSX.Element {
  return (
    <>
      <ActionPanel.Section title="Portfolio">
        <Action
          title="Add Account"
          icon={Icon.PlusCircle}
          shortcut={{ modifiers: ["cmd"], key: "n" }}
          onAction={onAddAccount}
        />

        {onSearchInvestments && (
          <Action
            title="Search Investments"
            icon={Icon.MagnifyingGlass}
            shortcut={{ modifiers: ["cmd"], key: "f" }}
            onAction={onSearchInvestments}
          />
        )}

        <Action
          title="Refresh Prices"
          icon={Icon.ArrowClockwise}
          shortcut={{ modifiers: ["cmd"], key: "r" }}
          onAction={onRefresh}
        />

        {onImportExport && (
          <Action
            title="Import / Export Portfolio"
            icon={Icon.Switch}
            shortcut={{ modifiers: ["cmd", "shift"], key: "i" }}
            onAction={onImportExport}
          />
        )}
      </ActionPanel.Section>

      {toggleDetailAction && <ActionPanel.Section title="View">{toggleDetailAction}</ActionPanel.Section>}
    </>
  );
}
