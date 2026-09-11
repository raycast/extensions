/**
 * EmptyPortfolio component.
 *
 * Displayed when the user has no accounts or positions in their portfolio.
 * Provides a friendly onboarding prompt with a clear call-to-action to
 * create their first investment account.
 *
 * Also offers a "See Sample Portfolio" option that loads a realistic
 * demo portfolio so new users can explore the extension's features
 * before adding their own data.
 *
 * Usage:
 * ```tsx
 * <EmptyPortfolio
 *   onAddAccount={() => push(<AccountForm />)}
 *   onLoadSample={() => loadSamplePortfolio()}
 * />
 * ```
 */

import React from "react";
import { ActionPanel, Action, Icon, List } from "@raycast/api";

// ──────────────────────────────────────────
// Props
// ──────────────────────────────────────────

interface EmptyPortfolioProps {
  /** Callback fired when the user chooses to add their first account */
  onAddAccount: () => void;

  /** Callback fired when the user chooses to load the sample portfolio */
  onLoadSample: () => void;

  /** Callback fired when the user chooses to import a portfolio from CSV */
  onImportExport?: () => void;
}

// ──────────────────────────────────────────
// Component
// ──────────────────────────────────────────

/**
 * Empty state view shown when the portfolio has no accounts.
 *
 * Renders a `List.EmptyView` with an icon, title, description,
 * and actions to either create the first account or preview
 * a sample portfolio.
 */
export function EmptyPortfolio({ onAddAccount, onLoadSample, onImportExport }: EmptyPortfolioProps): React.JSX.Element {
  const description: string = `Add ISAs, SIPPs, brokerages, Property, Crypto or Debt.\nPress: ⏎ Add | ⌘S Sample Portfolio | ⌘⇧I Import`;
  return (
    <List.EmptyView
      icon={Icon.BarChart}
      title="Welcome to Portfolio Tracker"
      description={description}
      actions={
        <ActionPanel>
          <Action title="Add Account" icon={Icon.PlusCircle} onAction={onAddAccount} />
          {onImportExport && (
            <Action
              title="Import Portfolio"
              icon={Icon.Download}
              shortcut={{ modifiers: ["cmd", "shift"], key: "i" }}
              onAction={onImportExport}
            />
          )}
          <Action
            title="See Sample Portfolio"
            icon={Icon.Eye}
            shortcut={{ modifiers: ["cmd"], key: "s" }}
            onAction={onLoadSample}
          />
        </ActionPanel>
      }
    />
  );
}
