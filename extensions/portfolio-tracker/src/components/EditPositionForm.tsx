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
import { Form, ActionPanel, Action, Icon, getPreferenceValues } from "@raycast/api";
import { useState, useMemo } from "react";
import { Position, AssetType } from "../utils/types";
import { ASSET_TYPE_LABELS } from "../utils/constants";
import {
  validateUnits,
  parseUnits,
  validateTotalValue,
  parseTotalValue,
  computeUnitsFromTotalValue,
} from "../utils/validation";
import { formatUnits, formatCurrency, getDisplayName, hasCustomName } from "../utils/formatting";
import { BatchRenameMatch } from "./BatchRenameForm";
import { useAssetPrice } from "../hooks/useAssetPrice";
import { useFxRate } from "../hooks/useFxRate";

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

/**
 * Input mode for specifying position size in the edit form.
 * - "units"  — user enters number of units directly
 * - "value"  — user enters total value, units are auto-calculated from priceOverride or last known price
 */
type EditInputMode = "units" | "value";

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
  // ── Price Data (for total-value mode) ──

  const isCash = position.assetType === AssetType.CASH;
  const isProperty = position.assetType === AssetType.MORTGAGE || position.assetType === AssetType.OWNED_PROPERTY;
  const isDebt =
    position.assetType === AssetType.CREDIT_CARD ||
    position.assetType === AssetType.LOAN ||
    position.assetType === AssetType.STUDENT_LOAN ||
    position.assetType === AssetType.AUTO_LOAN ||
    position.assetType === AssetType.BNPL;

  const symbol = isCash || isProperty || isDebt ? undefined : position.symbol;
  const { price, isLoading: isPriceLoading } = useAssetPrice(symbol);

  const { baseCurrency } = getPreferenceValues<Preferences>();

  const livePrice = useMemo(() => {
    if (position.priceOverride && position.priceOverride > 0) return position.priceOverride;
    return price?.price ?? 0;
  }, [position.priceOverride, price]);

  const showValueMode = !isCash && !isProperty && !isDebt && livePrice > 0;

  // ── Form State ──

  const [inputMode, setInputMode] = useState<EditInputMode>("units");
  const [unitsError, setUnitsError] = useState<string | undefined>(undefined);
  const [totalValueError, setTotalValueError] = useState<string | undefined>(undefined);
  const [totalValueInput, setTotalValueInput] = useState<string>("");
  const [valueCurrency, setValueCurrency] = useState<string>(baseCurrency);
  const [nameError, setNameError] = useState<string | undefined>(undefined);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ── Display Values ──

  const typeLabel = ASSET_TYPE_LABELS[position.assetType] ?? "Unknown";
  const currentUnitsDisplay = isCash ? formatCurrency(position.units, position.currency) : formatUnits(position.units);
  const displayName = getDisplayName(position);
  const isRenamed = hasCustomName(position);

  // Context-aware labels
  const unitsFieldTitle = isCash ? "Cash Amount" : "Number of Units";
  const unitsFieldPlaceholder = isCash ? "e.g. 500, 1250.50, 10000" : "e.g. 50, 12.5, 0.25";
  const unitsHelpText = isCash
    ? `Current balance: ${currentUnitsDisplay}. Enter the new total cash balance.`
    : `Current holding: ${currentUnitsDisplay} units. Enter the new total number of units you hold.`;

  // ── Currency options for value mode ──

  const valueCurrencyOptions = useMemo(() => {
    const options: Array<{ value: string; title: string }> = [];
    options.push({ value: baseCurrency, title: `${baseCurrency} (Base Currency)` });
    if (position.currency !== baseCurrency) {
      options.push({ value: position.currency, title: `${position.currency} (Asset Currency)` });
    }
    return options;
  }, [baseCurrency, position.currency]);

  const needsFxConversion = valueCurrency !== position.currency;

  // FX rate: valueCurrency → assetCurrency (only fetched when currencies differ)
  const { rate: fxRate, isLoading: isFxLoading } = useFxRate(
    needsFxConversion ? valueCurrency : undefined,
    needsFxConversion ? position.currency : undefined,
  );

  // ── Computed values for total-value mode ──

  const computedUnitsFromValue = useMemo(() => {
    const trimmed = totalValueInput.trim();
    if (!trimmed || !livePrice) return null;
    const parsed = Number(trimmed);
    if (isNaN(parsed) || parsed <= 0) return null;
    const valueInAssetCurrency = needsFxConversion && fxRate ? parsed * fxRate : parsed;
    if (needsFxConversion && !fxRate) return null;
    return computeUnitsFromTotalValue(valueInAssetCurrency, livePrice);
  }, [totalValueInput, livePrice, needsFxConversion, fxRate]);

  const computedValueDisplay = useMemo(() => {
    if (needsFxConversion && !fxRate && totalValueInput.trim()) {
      return "Loading FX rate...";
    }
    if (computedUnitsFromValue === null) return null;
    const nativeTotal = computedUnitsFromValue * livePrice;
    if (needsFxConversion && fxRate) {
      return `→ ${formatUnits(computedUnitsFromValue)} units × ${formatCurrency(livePrice, position.currency)} = ${formatCurrency(nativeTotal, position.currency)} (${formatCurrency(Number(totalValueInput.trim()), valueCurrency)} at ${fxRate.toFixed(4)} ${valueCurrency}/${position.currency})`;
    }
    return `→ ${formatUnits(computedUnitsFromValue)} units × ${formatCurrency(livePrice, position.currency)} = ${formatCurrency(nativeTotal, position.currency)}`;
  }, [computedUnitsFromValue, livePrice, position.currency, needsFxConversion, fxRate, totalValueInput, valueCurrency]);

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

  function handleTotalValueBlur(event: Form.Event<string>) {
    if (event.target.value && event.target.value.trim().length > 0) {
      const error = validateTotalValue(event.target.value);
      setTotalValueError(error);
    }
  }

  function handleTotalValueChange(value: string) {
    setTotalValueInput(value);
    if (totalValueError) setTotalValueError(undefined);
  }

  function handleInputModeChange(value: string) {
    setInputMode(value as EditInputMode);
    setUnitsError(undefined);
    setTotalValueError(undefined);
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

  async function handleSubmit(values: {
    units?: string;
    totalValue?: string;
    inputMode?: string;
    valueCurrency?: string;
    displayName?: string;
  }) {
    // Validate name (if provided)
    const trimmedName = values.displayName?.trim() ?? "";
    if (trimmedName && trimmedName === position.name) {
      setNameError("Same as original name — clear the field to use the original, or enter a different name");
      return;
    }

    let newUnits: number;

    if (!isCash && inputMode === "value") {
      const tvValidation = validateTotalValue(values.totalValue);
      if (tvValidation) {
        setTotalValueError(tvValidation);
        return;
      }
      if (needsFxConversion && !fxRate) {
        setTotalValueError("FX rate not available yet. Please wait a moment.");
        return;
      }

      const totalValue = parseTotalValue(values.totalValue!);
      const totalValueInAssetCurrency = needsFxConversion && fxRate ? totalValue * fxRate : totalValue;
      newUnits = computeUnitsFromTotalValue(totalValueInAssetCurrency, livePrice);
      if (newUnits <= 0) {
        setTotalValueError("Computed units would be zero — check the price and total value.");
        return;
      }
    } else {
      const unitValidation = validateUnits(values.units);
      if (unitValidation) {
        setUnitsError(unitValidation);
        return;
      }
      newUnits = parseUnits(values.units!);
    }

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
      isLoading={isSubmitting || isPriceLoading || isFxLoading}
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

      {/* ── Input Mode Toggle (non-cash, non-property, non-debt positions) ── */}
      {showValueMode && (
        <Form.Dropdown id="inputMode" title="Specify By" value={inputMode} onChange={handleInputModeChange}>
          <Form.Dropdown.Item value="units" title="Number of Units" icon={Icon.Hashtag} />
          <Form.Dropdown.Item value="value" title="Total Value Invested" icon={Icon.BankNote} />
        </Form.Dropdown>
      )}

      {/* ── Units (editable, default mode) ── */}
      {(isCash || !showValueMode || inputMode === "units") && (
        <>
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
        </>
      )}

      {/* ── Total Value (value mode, non-cash only) ── */}
      {showValueMode && inputMode === "value" && (
        <>
          {/* ── Currency Selector ── */}
          <Form.Dropdown id="valueCurrency" title="Value Currency" value={valueCurrency} onChange={setValueCurrency}>
            {valueCurrencyOptions.map((opt) => (
              <Form.Dropdown.Item key={opt.value} value={opt.value} title={opt.title} />
            ))}
          </Form.Dropdown>

          <Form.TextField
            id="totalValue"
            title="Total Value"
            placeholder={`e.g. 1000, 5000, 25000 (${valueCurrency})`}
            error={totalValueError}
            onChange={handleTotalValueChange}
            onBlur={handleTotalValueBlur}
          />

          <Form.Description
            title=""
            text={
              computedValueDisplay
                ? computedValueDisplay
                : livePrice > 0
                  ? needsFxConversion
                    ? `Enter total amount in ${valueCurrency}. Will be converted to ${position.currency} then divided by ${formatCurrency(livePrice, position.currency)}/unit.`
                    : `Enter total value in ${valueCurrency}. Units will be calculated at ${formatCurrency(livePrice, position.currency)}/unit.`
                  : "Waiting for price data..."
            }
          />
        </>
      )}
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
