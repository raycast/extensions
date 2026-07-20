/**
 * AccountActions component.
 *
 * Per-account action panel items displayed when the user selects an account
 * or a position within an account. Provides actions for managing the account
 * itself and for adding new positions to it.
 *
 * These actions are rendered as an ActionPanel.Section and can be composed
 * alongside PortfolioActions and PositionActions in the same ActionPanel.
 *
 * Features:
 * - Add Position — navigates to the search view scoped to this account
 * - Edit Account — navigates to the AccountForm in edit mode
 * - Delete Account — removes the account with confirmation alert
 *
 * Usage:
 * ```tsx
 * <ActionPanel>
 *   <AccountActions
 *     account={account}
 *     onAddPosition={() => push(<SearchView accountId={account.id} />)}
 *     onEditAccount={() => push(<AccountForm account={account} onSubmit={...} />)}
 *     onDeleteAccount={() => removeAccount(account.id)}
 *   />
 * </ActionPanel>
 * ```
 */

import React from "react";
import { Action, ActionPanel, Alert, Icon, confirmAlert } from "@raycast/api";
import { Account, isPropertyAccountType, isDebtAccountType } from "../../utils/types";
import { ACCOUNT_TYPE_LABELS, COLOR_DESTRUCTIVE } from "../../utils/constants";

// ──────────────────────────────────────────
// Props
// ──────────────────────────────────────────

interface AccountActionsProps {
  /** The account these actions apply to */
  account: Account;

  /** Callback to navigate to the search view for adding a position to this account */
  onAddPosition: () => void;

  /** Callback to navigate to the "Add Cash" form for this account */
  onAddCash: () => void;

  /** Callback to navigate to the "Add Property" form for this account */
  onAddProperty?: () => void;

  /** Callback to navigate to the "Add Debt" form for this account */
  onAddDebt?: () => void;

  /** Callback to navigate to the edit form for this account */
  onEditAccount: () => void;

  /**
   * Callback to delete this account and all its positions.
   * The component handles the confirmation dialog internally.
   */
  onDeleteAccount: () => Promise<void>;
}

// ──────────────────────────────────────────
// Component
// ──────────────────────────────────────────

/**
 * Per-account actions rendered in an ActionPanel.Section.
 *
 * Actions:
 * 1. Add Position — start the search flow to add a new holding
 * 2. Add Cash — add a cash balance to the account
 * 3. Edit Account — modify name or type
 * 4. Delete Account — remove with confirmation (destructive)
 *
 * The delete action shows a confirmation alert before proceeding,
 * warning the user that all positions within the account will be lost.
 *
 * Keyboard shortcuts:
 * - ⇧⌘N → Add Position to this account (hidden for Property/Debt accounts)
 * - ⇧⌘P → Add Property to this account (Property accounts only)
 * - ⇧⌘D → Add Debt to this account (Debt accounts only)
 * - ⇧⌘C → Add Cash to this account
 * - ⌘E → Edit Account
 * - ⌃X → Delete Account (with confirmation)
 */
export function AccountActions({
  account,
  onAddPosition,
  onAddCash,
  onAddProperty,
  onAddDebt,
  onEditAccount,
  onDeleteAccount,
}: AccountActionsProps): React.JSX.Element {
  const typeLabel = ACCOUNT_TYPE_LABELS[account.type] ?? account.type;
  const positionCount = account.positions.length;
  const isProperty = isPropertyAccountType(account.type);
  const isDebt = isDebtAccountType(account.type);

  /**
   * Shows a confirmation dialog before deleting the account.
   * Warns the user about the number of positions that will be removed.
   */
  async function handleDeleteWithConfirmation() {
    const positionWarning =
      positionCount > 0
        ? `This account contains ${positionCount} position${positionCount === 1 ? "" : "s"} that will also be removed.`
        : "This account has no positions.";

    const confirmed = await confirmAlert({
      title: `Delete "${account.name}"?`,
      message: `${positionWarning} This action cannot be undone.`,
      icon: { source: Icon.Trash, tintColor: COLOR_DESTRUCTIVE },
      primaryAction: {
        title: "Delete Account",
        style: Alert.ActionStyle.Destructive,
      },
      dismissAction: {
        title: "Cancel",
      },
    });

    if (confirmed) {
      await onDeleteAccount();
    }
  }

  return (
    <ActionPanel.Section title={`${account.name} (${typeLabel})`}>
      {/* Property accounts show "Add Property" as the primary add action */}
      {isProperty && onAddProperty && (
        <Action
          title="Add Property"
          icon={Icon.House}
          shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
          onAction={onAddProperty}
        />
      )}

      {/* Debt accounts show "Add Debt" as the primary add action */}
      {isDebt && onAddDebt && (
        <Action
          title="Add Debt"
          icon={Icon.CreditCard}
          shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
          onAction={onAddDebt}
        />
      )}

      {/* Non-property, non-debt accounts show "Add Position" (Yahoo search) */}
      {!isProperty && !isDebt && (
        <Action
          title="Add Position"
          icon={Icon.PlusSquare}
          shortcut={{ modifiers: ["cmd", "shift"], key: "n" }}
          onAction={onAddPosition}
        />
      )}

      {/* Cash deposits only make sense for investment/savings accounts */}
      {!isDebt && !isProperty && (
        <Action
          title="Add Cash"
          icon={Icon.BankNote}
          shortcut={{ modifiers: ["ctrl", "cmd"], key: "c" }}
          onAction={onAddCash}
        />
      )}

      <Action
        title="Edit Account"
        icon={Icon.Pencil}
        shortcut={{ modifiers: ["cmd"], key: "e" }}
        onAction={onEditAccount}
      />

      <Action
        title="Delete Account"
        icon={Icon.Trash}
        style={Action.Style.Destructive}
        shortcut={{ modifiers: ["ctrl"], key: "x" }}
        onAction={handleDeleteWithConfirmation}
      />
    </ActionPanel.Section>
  );
}
