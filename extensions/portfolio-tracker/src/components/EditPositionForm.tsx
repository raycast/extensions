/**
 * EditPositionForm component.
 *
 * A two-phase Raycast Form for editing an existing position:
 *
 * **Phase 1 — Edit Mode:**
 * - Editable "Display Name" field for setting a custom name (non-cash assets)
 * - Editable "Units" field for adjusting the holding amount
 * - Read-only context: original name (when renamed), symbol, type, currency, account
 * - "Restore Original Name" action (⌘⇧R) with ↩️ icon when a custom name is set
 *
 * **Phase 2 — Batch Rename Mode:**
 * - Shown after saving a rename when other positions share the same original name
 * - Checkboxes for each matching position (pre-checked)
 * - "Apply to Selected" and "Skip" actions
 *
 * Both phases live in the same navigation frame (Portfolio → EditAssetForm).
 * A single `onDone()` call pops back to the portfolio dashboard.
 *
 * Usage:
 * ```tsx
 * <EditPositionForm
 *   position={position}
 *   accountId={account.id}
 *   accountName={account.name}
 *   onSave={async (updates) => {
 *     // Save changes, return batch rename matches
 *     return matches;
 *   }}
 *   onBatchApply={async (renames) => {
 *     await batchRenamePositions(renames);
 *   }}
 *   onRestoreName={async () => {
 *     await restorePositionName(account.id, position.id);
 *   }}
 *   onDone={() => { pop(); revalidatePortfolio(); }}
 * />
 * ```
 */

import React from "react";
import { Form, ActionPanel, Action, Icon } from "@raycast/api";
import { useState } from "react";
import { Position } from "../utils/types";
import { ASSET_TYPE_LABELS } from "../utils/constants";
import { validateUnits, parseUnits } from "../utils/validation";
import { formatUnits, formatCurrency, getDisplayName, hasCustomName } from "../utils/formatting";
import { BatchRenameMatch } from "./BatchRenameForm";

// ──────────────────────────────────────────
// Props
// ──────────────────────────────────────────

/** The set of changes produced by the form on submission */
export interface EditPositionUpdates {
  /** The new number of units (already parsed and validated) */
  units: number;

  /**
   * The new custom display name, or `undefined` to leave unchanged.
   *
   * - A non-empty string means "set this as the custom name"
   * - `""` (empty string) means "the user cleared the field" (no change if there was no custom name)
   * - `undefined` means "no change"
   */
  customName: string | undefined;

  /** Whether the units value changed from the original */
  unitsChanged: boolean;

  /** Whether the custom name changed from the original */
  nameChanged: boolean;
}

interface EditPositionFormProps {
  /** The position to edit */
  position: Position;

  /** The ID of the account containing this position */
  accountId: string;

  /** The name of the account (for display context) */
  accountName: string;

  /**
   * Callback fired when the form is submitted with valid values.
   * The parent saves changes to the original asset and returns
   * any batch rename candidates (positions sharing the same original name).
   *
   * @param updates - The parsed and validated form values
   * @returns Array of matching positions for batch rename (empty if none)
   */
  onSave: (updates: EditPositionUpdates) => Promise<BatchRenameMatch[]>;

  /**
   * Callback to apply batch renames to selected positions.
   * Called with the full list of { accountId, positionId, customName } objects.
   */
  onBatchApply: (renames: Array<{ accountId: string; positionId: string; customName: string }>) => Promise<void>;

  /**
   * Callback fired when the user restores the original name via "Restore Original Name".
   * Removes the custom name and reverts to the Yahoo Finance name.
   */
  onRestoreName: () => Promise<void>;

  /**
   * Callback fired when the form is completely done (edit saved, batch handled or skipped).
   * The parent uses this to pop the navigation and revalidate the portfolio.
   */
  onDone: () => void;
}

// ──────────────────────────────────────────
// Phase type
// ──────────────────────────────────────────

interface BatchPhaseState {
  customName: string;
  originalName: string;
  matches: BatchRenameMatch[];
}

// ──────────────────────────────────────────
// Component
// ──────────────────────────────────────────

/**
 * Two-phase form for editing a position.
 *
 * Phase 1: Edit units and display name. On submit, saves and checks for
 * batch rename candidates. If found, transitions to Phase 2.
 *
 * Phase 2: Batch rename. Shows matching positions as checkboxes.
 * "Apply to Selected" renames checked positions. "Skip" dismisses.
 * Both call `onDone()` to return to the portfolio.
 */
export function EditPositionForm({
  position,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  accountId,
  accountName,
  onSave,
  onBatchApply,
  onRestoreName,
  onDone,
}: EditPositionFormProps): React.JSX.Element {
  // ── Phase State ──

  const [batchPhase, setBatchPhase] = useState<BatchPhaseState | null>(null);

  if (batchPhase) {
    return (
      <BatchPhaseForm
        customName={batchPhase.customName}
        originalName={batchPhase.originalName}
        matches={batchPhase.matches}
        onBatchApply={onBatchApply}
        onDone={onDone}
      />
    );
  }

  return (
    <EditPhaseForm
      position={position}
      accountName={accountName}
      onSave={onSave}
      onRestoreName={onRestoreName}
      onDone={onDone}
      onBatchNeeded={setBatchPhase}
    />
  );
}

// ──────────────────────────────────────────
// Phase 1 — Edit Mode
// ──────────────────────────────────────────

interface EditPhaseFormProps {
  position: Position;
  accountName: string;
  onSave: (updates: EditPositionUpdates) => Promise<BatchRenameMatch[]>;
  onRestoreName: () => Promise<void>;
  onDone: () => void;
  onBatchNeeded: (state: BatchPhaseState) => void;
}

function EditPhaseForm({
  position,
  accountName,
  onSave,
  onRestoreName,
  onDone,
  onBatchNeeded,
}: EditPhaseFormProps): React.JSX.Element {
  // ── Form State ──

  const [unitsError, setUnitsError] = useState<string | undefined>(undefined);
  const [nameError, setNameError] = useState<string | undefined>(undefined);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ── Display Values ──

  const typeLabel = ASSET_TYPE_LABELS[position.assetType] ?? "Unknown";
  const isCash = position.assetType === "CASH";
  const currentUnitsDisplay = isCash ? formatCurrency(position.units, position.currency) : formatUnits(position.units);
  const displayName = getDisplayName(position);
  const isRenamed = hasCustomName(position);

  // Context-aware labels
  const unitsFieldTitle = isCash ? "Cash Amount" : "Number of Units";
  const unitsFieldPlaceholder = isCash ? "e.g. 500, 1250.50, 10000" : "e.g. 50, 12.5, 0.25";
  const unitsHelpText = isCash
    ? `Current balance: ${currentUnitsDisplay}. Enter the new total cash balance.`
    : `Current holding: ${currentUnitsDisplay} units. Enter the new total number of units you hold.`;

  // ── Validation ──

  function handleUnitsBlur(event: Form.Event<string>) {
    const value = event.target.value;
    if (value && value.trim().length > 0) {
      const error = validateUnits(value);
      setUnitsError(error);
    }
  }

  function handleUnitsChange() {
    if (unitsError) {
      setUnitsError(undefined);
    }
  }

  function handleNameBlur(event: Form.Event<string>) {
    const value = event.target.value?.trim();
    if (value && value === position.name) {
      setNameError("Same as original name — clear the field to use the original, or enter a different name");
    } else {
      setNameError(undefined);
    }
  }

  function handleNameChange() {
    if (nameError) {
      setNameError(undefined);
    }
  }

  // ── Submission ──

  async function handleSubmit(values: { units: string; displayName?: string }) {
    // Validate units
    const unitValidation = validateUnits(values.units);
    if (unitValidation) {
      setUnitsError(unitValidation);
      return;
    }

    // Validate name (if provided)
    const trimmedName = values.displayName?.trim() ?? "";
    if (trimmedName && trimmedName === position.name) {
      setNameError("Same as original name — clear the field to use the original, or enter a different name");
      return;
    }

    const newUnits = parseUnits(values.units);

    // Determine what changed
    const unitsChanged = newUnits !== position.units;
    const oldCustomName = position.customName?.trim() ?? "";
    const nameChanged = trimmedName !== oldCustomName;

    // Skip if nothing changed
    if (!unitsChanged && !nameChanged) {
      onDone();
      return;
    }

    setIsSubmitting(true);

    try {
      // Parent saves the original asset and returns batch candidates
      const matches = await onSave({
        units: newUnits,
        customName: trimmedName || undefined,
        unitsChanged,
        nameChanged,
      });

      // If batch candidates found, transition to phase 2
      if (matches.length > 0 && trimmedName) {
        onBatchNeeded({
          customName: trimmedName,
          originalName: position.name,
          matches,
        });
        return; // Don't call onDone — batch phase will handle it
      }

      // No batch needed — we're done
      onDone();
    } catch (error) {
      console.error("EditPositionForm submission failed:", error);
    } finally {
      setIsSubmitting(false);
    }
  }

  // ── Restore Name ──

  async function handleRestoreNameAction() {
    await onRestoreName();
    onDone();
  }

  // ── Render ──

  return (
    <Form
      navigationTitle={`Edit ${displayName}`}
      isLoading={isSubmitting}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Changes" icon={Icon.Check} onSubmit={handleSubmit} />

          {/* ── Restore Original Name (only when asset has a custom name) ── */}
          {!isCash && isRenamed && (
            <Action
              title="Restore Original Name"
              icon={Icon.Undo}
              shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
              onAction={handleRestoreNameAction}
            />
          )}

          <Action
            title="Cancel"
            icon={Icon.XMarkCircle}
            onAction={onDone}
            shortcut={{ modifiers: ["cmd"], key: "." }}
          />
        </ActionPanel>
      }
    >
      {/* ── Display Name (editable, non-cash only) ── */}
      {!isCash && (
        <>
          <Form.TextField
            id="displayName"
            title="Display Name"
            placeholder={position.name}
            defaultValue={position.customName ?? ""}
            error={nameError}
            onChange={handleNameChange}
            onBlur={handleNameBlur}
          />

          {isRenamed ? (
            <Form.Description title="" text={`↩️ Original: ${position.name}  (⌘⇧R to restore)`} />
          ) : (
            <Form.Description
              title=""
              text="Leave empty to use the original Yahoo Finance name. Set a custom name for cleaner display."
            />
          )}

          <Form.Separator />
        </>
      )}

      {/* ── Read-Only Context ── */}
      {!isCash && <Form.Description title="Symbol" text={position.symbol} />}
      <Form.Description title="Type" text={typeLabel} />
      <Form.Description title="Currency" text={position.currency} />
      <Form.Description title="Account" text={accountName} />

      <Form.Separator />

      {/* ── Units (editable) ── */}
      <Form.TextField
        id="units"
        title={unitsFieldTitle}
        placeholder={unitsFieldPlaceholder}
        defaultValue={isCash ? String(position.units) : currentUnitsDisplay}
        error={unitsError}
        onChange={handleUnitsChange}
        onBlur={handleUnitsBlur}
      />

      <Form.Description title="" text={unitsHelpText} />
    </Form>
  );
}

// ──────────────────────────────────────────
// Phase 2 — Batch Rename Mode
// ──────────────────────────────────────────

interface BatchPhaseFormProps {
  customName: string;
  originalName: string;
  matches: BatchRenameMatch[];
  onBatchApply: (renames: Array<{ accountId: string; positionId: string; customName: string }>) => Promise<void>;
  onDone: () => void;
}

function BatchPhaseForm({
  customName,
  originalName,
  matches,
  onBatchApply,
  onDone,
}: BatchPhaseFormProps): React.JSX.Element {
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ── Submission ──

  async function handleSubmit(values: Record<string, boolean>) {
    // Collect checked positions
    const selected = matches
      .filter((match) => values[match.position.id] === true)
      .map((match) => ({
        accountId: match.accountId,
        positionId: match.position.id,
        customName,
      }));

    if (selected.length === 0) {
      // Nothing selected — treat as skip
      onDone();
      return;
    }

    setIsSubmitting(true);

    try {
      await onBatchApply(selected);
      onDone();
    } catch (error) {
      console.error("BatchPhaseForm submission failed:", error);
    } finally {
      setIsSubmitting(false);
    }
  }

  // ── Render ──

  const matchCount = matches.length;
  const positionWord = matchCount === 1 ? "position" : "positions";

  return (
    <Form
      navigationTitle="Rename Matching Assets"
      isLoading={isSubmitting}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Apply to Selected" icon={Icon.Check} onSubmit={handleSubmit} />
          <Action
            title="Skip"
            icon={Icon.XMarkCircle}
            style={Action.Style.Regular}
            shortcut={{ modifiers: ["cmd"], key: "." }}
            onAction={onDone}
          />
        </ActionPanel>
      }
    >
      <Form.Description
        title="Rename Matching Assets?"
        text={`You renamed "${originalName}" to "${customName}". Found ${matchCount} other ${positionWord} with the same original name.`}
      />

      <Form.Separator />

      {matches.map((match) => {
        const currentDisplay = getDisplayName(match.position);
        const label = `${currentDisplay} — ${match.position.symbol}`;
        const description = `in ${match.accountName}`;

        return (
          <Form.Checkbox
            key={match.position.id}
            id={match.position.id}
            label={label}
            info={description}
            defaultValue={true}
          />
        );
      })}

      <Form.Separator />

      <Form.Description
        title=""
        text={`Selected positions will be renamed to "${customName}". Their original Yahoo Finance name is preserved and visible on hover.`}
      />
    </Form>
  );
}
