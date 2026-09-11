/**
 * PositionActions component.
 *
 * Per-position action panel items displayed when the user selects a specific
 * position (holding) within an account. Provides actions for managing the
 * individual position — adding units, editing units, or removing it entirely.
 *
 * These actions are rendered as an ActionPanel.Section and can be composed
 * alongside PortfolioActions and AccountActions in the same ActionPanel.
 *
 * Features:
 * - Add Units — navigates to a form to add purchased units to the position
 * - Edit Asset — navigates to an edit form to change units or rename the asset
 * - Remove Position — removes the position with confirmation alert
 * - Copy Symbol — copies the Yahoo Finance symbol to clipboard
 * - Copy Name — copies the display name (custom or original) to clipboard
 * - Copy Original Name — copies the Yahoo Finance name (only shown when renamed)
 *
 * Usage:
 * ```tsx
 * <ActionPanel>
 *   <PositionActions
 *     position={position}
 *     accountId={account.id}
 *     onEditPosition={() => push(<EditPositionForm ... />)}
 *     onDeletePosition={() => removePosition(account.id, position.id)}
 *   />
 * </ActionPanel>
 * ```
 */

import React from "react";
import { Action, ActionPanel, Alert, Icon, confirmAlert } from "@raycast/api";
import { Position, isDebtAssetType } from "../../utils/types";
import { getDisplayName, hasCustomName, formatUnits } from "../../utils/formatting";
import { ASSET_TYPE_LABELS, COLOR_DESTRUCTIVE } from "../../utils/constants";

// ──────────────────────────────────────────
// Props
// ──────────────────────────────────────────

interface PositionActionsProps {
  /** The position these actions apply to */
  position: Position;

  /** The ID of the account that contains this position */
  accountId: string;

  /** Whether this position is a property (MORTGAGE or OWNED_PROPERTY) */
  isProperty?: boolean;

  /** Whether this position is a debt (CREDIT_CARD, LOAN, etc.) */
  isDebt?: boolean;

  /**
   * Callback to navigate to the add-units form for this position.
   * Typically pushes an AddUnitsForm onto the navigation stack.
   * Not used for property positions.
   */
  onAddUnits: () => void;

  /**
   * Callback to navigate to the edit form for this position.
   * Typically pushes an EditPositionForm or EditMortgageForm onto the navigation stack.
   */
  onEditPosition: () => void;

  /**
   * Callback to add a new valuation to a property position.
   * Navigates to the edit mortgage form (same as edit, but conceptually "new valuation").
   * Only used for property positions.
   */
  onAddValuation?: () => void;

  /**
   * Callback to show the full calculation breakdown for a property position.
   * Pushes a MortgageCalculationsDetail view onto the navigation stack.
   * Only used for property positions.
   */
  onShowCalculations?: () => void;

  /**
   * Callback to edit a debt position.
   * Pushes an EditDebtForm onto the navigation stack.
   * Only used for debt positions.
   */
  onEditDebt?: () => void;

  /**
   * Callback to archive/unarchive a debt position.
   * Toggles the archived state. Only used for paid-off debt positions.
   */
  onArchiveDebt?: () => void;

  /**
   * Callback to delete this position from the account.
   * The component handles the confirmation dialog internally.
   */
  onDeletePosition: () => Promise<void>;
}

// ──────────────────────────────────────────
// Component
// ──────────────────────────────────────────

/**
 * Per-position actions rendered in an ActionPanel.Section.
 *
 * Actions:
 * 1. Add Units — increment the unit count (for periodic purchases)
 * 2. Edit Asset — edit units, rename, or restore original name
 * 3. Remove Position — delete with confirmation (destructive)
 * 4. Copy Symbol — copies the Yahoo Finance symbol to clipboard
 * 5. Copy Name — copies the display name to clipboard
 * 6. Copy Original Name — copies the original Yahoo Finance name (only if renamed)
 *
 * The delete action shows a confirmation alert before proceeding,
 * displaying the position name and current units for clarity.
 *
 * Keyboard shortcuts:
 * - ⇧⌘U → Add Units (non-property, non-debt only)
 * - ⌘E → Edit Asset / Edit Debt
 * - ⇧⌘V → Add Valuation (property only)
 * - ⌥⌘K → Show Calculations (property only)
 * - ⌥⌘A → Archive Debt (paid-off debt only)
 * - ⌃X → Remove Position (with confirmation)
 * - ⌘C → Copy Symbol
 * - ⇧⌘C → Copy Name
 */
export function PositionActions({
  position,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  accountId,
  isProperty = false,
  isDebt = false,
  onAddUnits,
  onEditPosition,
  onAddValuation,
  onShowCalculations,
  onEditDebt,
  onArchiveDebt,
  onDeletePosition,
}: PositionActionsProps): React.JSX.Element {
  const displayName = getDisplayName(position);
  const isRenamed = hasCustomName(position);

  /**
   * Shows a confirmation dialog before removing the position.
   * Displays the asset display name and current unit count for the user to verify.
   */
  async function handleDeleteWithConfirmation() {
    const confirmed = await confirmAlert({
      title: `Remove "${displayName}"?`,
      message: `This will remove ${formatUnits(position.units)} unit${position.units === 1 ? "" : "s"} of ${position.symbol} from your account. This action cannot be undone.`,
      icon: { source: Icon.Trash, tintColor: COLOR_DESTRUCTIVE },
      primaryAction: {
        title: "Remove Position",
        style: Alert.ActionStyle.Destructive,
      },
      dismissAction: {
        title: "Cancel",
      },
    });

    if (confirmed) {
      await onDeletePosition();
    }
  }

  const isDebtPosition = isDebt || isDebtAssetType(position.assetType);
  const isPaidOff = isDebtPosition && position.debtData?.paidOff === true;
  const isArchived = isDebtPosition && position.debtData?.archived === true;

  return (
    <>
      <ActionPanel.Section
        title={
          isDebtPosition
            ? `${displayName}: ${ASSET_TYPE_LABELS[position.assetType] ?? "Debt"}`
            : `${displayName} (${position.symbol})`
        }
      >
        {/* Debt: Edit Debt is the default action */}
        {isDebtPosition ? (
          <>
            {onEditDebt && (
              <Action
                title="Edit Debt"
                icon={Icon.Pencil}
                shortcut={{ modifiers: ["cmd"], key: "e" }}
                onAction={onEditDebt}
              />
            )}

            {isPaidOff && onArchiveDebt && (
              <Action
                title={isArchived ? "Unarchive Debt" : "Archive Debt"}
                icon={isArchived ? Icon.Eye : Icon.Tray}
                shortcut={{ modifiers: ["cmd", "opt"], key: "a" }}
                onAction={onArchiveDebt}
              />
            )}
          </>
        ) : isProperty ? (
          /* Property: Edit Asset is the default action */
          <>
            <Action
              title="Edit Asset"
              icon={Icon.Pencil}
              shortcut={{ modifiers: ["cmd"], key: "e" }}
              onAction={onEditPosition}
            />

            {onAddValuation && (
              <Action
                title="Add Valuation"
                icon={Icon.Calendar}
                shortcut={{ modifiers: ["cmd", "shift"], key: "v" }}
                onAction={onAddValuation}
              />
            )}

            {onShowCalculations && (
              <Action
                title="Show Calculations"
                icon={Icon.Calculator}
                shortcut={{ modifiers: ["cmd", "opt"], key: "k" }}
                onAction={onShowCalculations}
              />
            )}
          </>
        ) : (
          /* Regular positions: Add Units is default */
          <>
            <Action
              title="Add Units"
              icon={Icon.PlusSquare}
              shortcut={{ modifiers: ["cmd", "shift"], key: "u" }}
              onAction={onAddUnits}
            />

            <Action
              title="Edit Asset"
              icon={Icon.Pencil}
              shortcut={{ modifiers: ["cmd"], key: "e" }}
              onAction={onEditPosition}
            />
          </>
        )}

        <Action
          title="Remove Position"
          icon={Icon.Trash}
          style={Action.Style.Destructive}
          shortcut={{ modifiers: ["ctrl"], key: "x" }}
          onAction={handleDeleteWithConfirmation}
        />
      </ActionPanel.Section>

      <ActionPanel.Section title="Copy">
        <Action.CopyToClipboard
          title="Copy Symbol"
          content={position.symbol}
          shortcut={{ modifiers: ["cmd"], key: "c" }}
        />

        <Action.CopyToClipboard
          title="Copy Name"
          content={displayName}
          shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
        />

        {isRenamed && (
          <Action.CopyToClipboard
            title="Copy Original Name"
            content={position.name}
            shortcut={{ modifiers: ["cmd", "opt"], key: "c" }}
          />
        )}
      </ActionPanel.Section>
    </>
  );
}
