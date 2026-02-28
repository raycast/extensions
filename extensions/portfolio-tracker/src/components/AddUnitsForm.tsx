/**
 * AddUnitsForm component.
 *
 * A Raycast Form view for adding units to an existing position.
 * Unlike EditPositionForm (which sets an absolute unit count), this form
 * lets the user specify how many NEW units to add. The final total is
 * computed as `currentUnits + addedUnits`.
 *
 * This is designed for long-term investors who periodically buy more
 * of the same asset and want to avoid manual arithmetic.
 *
 * Features:
 * - Displays current position info (name, symbol, currency, current units)
 * - Input field for units to add
 * - Live "new total" preview as the user types
 * - Validation for the units input (positive number, max 6 decimal places)
 * - Toast notification on successful update
 * - Automatic navigation pop on submission
 *
 * Usage:
 * ```tsx
 * <AddUnitsForm
 *   position={position}
 *   accountId={account.id}
 *   accountName={account.name}
 *   onSubmit={async (newTotalUnits) => {
 *     await updatePosition(account.id, position.id, newTotalUnits);
 *   }}
 * />
 * ```
 */

import React from "react";
import { Form, ActionPanel, Action, Icon, useNavigation } from "@raycast/api";
import { useState, useMemo } from "react";
import { Position, AssetType } from "../utils/types";
import { ASSET_TYPE_LABELS } from "../utils/constants";
import { validateUnits, parseUnits } from "../utils/validation";
import { formatUnits, formatCurrency, getDisplayName } from "../utils/formatting";

// ──────────────────────────────────────────
// Props
// ──────────────────────────────────────────

interface AddUnitsFormProps {
  /** The position to add units to */
  position: Position;

  /** The ID of the account containing this position */
  accountId: string;

  /** The name of the account (for display context) */
  accountName: string;

  /**
   * Callback fired when the form is submitted with a valid value.
   * Receives the NEW TOTAL units (currentUnits + addedUnits), already computed.
   *
   * @param newTotalUnits - The updated total number of units
   */
  onSubmit: (newTotalUnits: number) => Promise<void>;
}

// ──────────────────────────────────────────
// Component
// ──────────────────────────────────────────

/**
 * Form for adding units to an existing position.
 *
 * Renders a Raycast Form with:
 * - Read-only context: asset name, symbol, type, account, currency, current units
 * - Editable field: number of units to add
 * - Live preview: computed new total
 * - Submit action that validates, computes new total, and calls `onSubmit`
 *
 * On successful submission, the form automatically navigates back (pops).
 */
export function AddUnitsForm({
  position,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  accountId,
  accountName,
  onSubmit,
}: AddUnitsFormProps): React.JSX.Element {
  const { pop } = useNavigation();

  // ── Form State ──

  const [unitsToAdd, setUnitsToAdd] = useState<string>("");
  const [unitsError, setUnitsError] = useState<string | undefined>(undefined);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ── Display Values ──

  const typeLabel = ASSET_TYPE_LABELS[position.assetType] ?? "Unknown";
  const isCash = position.assetType === AssetType.CASH;
  const currentUnitsDisplay = isCash ? formatCurrency(position.units, position.currency) : formatUnits(position.units);

  // Context-aware labels
  const displayName = getDisplayName(position);
  const navTitle = isCash ? `Add Cash — ${displayName}` : `Add Units — ${displayName}`;
  const submitTitle = isCash ? "Add Cash" : "Add Units";
  const fieldTitle = isCash ? "Amount to Add" : "Units to Add";
  const fieldPlaceholder = isCash ? "e.g. 500, 1250.50, 10000" : "e.g. 10, 5.5, 0.25";
  const currentLabel = isCash ? "Current Balance" : "Current Units";

  // ── Computed New Total ──

  const newTotal = useMemo(() => {
    const trimmed = unitsToAdd.trim();
    if (trimmed.length === 0) return null;
    const parsed = Number(trimmed);
    if (isNaN(parsed) || parsed <= 0) return null;
    return position.units + parsed;
  }, [unitsToAdd, position.units]);

  const newTotalDisplay =
    newTotal !== null ? (isCash ? formatCurrency(newTotal, position.currency) : formatUnits(newTotal)) : "—";

  // ── Validation ──

  function handleUnitsBlur(event: Form.Event<string>) {
    const value = event.target.value;
    if (value && value.trim().length > 0) {
      const error = validateUnits(value);
      setUnitsError(error);
    }
  }

  function handleUnitsChange(value: string) {
    setUnitsToAdd(value);
    if (unitsError) {
      setUnitsError(undefined);
    }
  }

  // ── Submission ──

  async function handleSubmit(values: { unitsToAdd: string }) {
    // Validate the input
    const unitValidation = validateUnits(values.unitsToAdd);
    if (unitValidation) {
      setUnitsError(unitValidation);
      return;
    }

    const addedUnits = parseUnits(values.unitsToAdd);
    const computedTotal = position.units + addedUnits;

    setIsSubmitting(true);

    try {
      await onSubmit(computedTotal);
      pop();
    } catch (error) {
      console.error("AddUnitsForm submission failed:", error);
    } finally {
      setIsSubmitting(false);
    }
  }

  // ── Render ──

  return (
    <Form
      navigationTitle={navTitle}
      isLoading={isSubmitting}
      actions={
        <ActionPanel>
          <Action.SubmitForm title={submitTitle} icon={Icon.PlusCircle} onSubmit={handleSubmit} />
          <Action title="Cancel" icon={Icon.XMarkCircle} onAction={pop} shortcut={{ modifiers: ["cmd"], key: "." }} />
        </ActionPanel>
      }
    >
      {/* ── Read-Only Context ── */}
      <Form.Description title="Asset" text={displayName} />
      {!isCash && <Form.Description title="Symbol" text={position.symbol} />}
      <Form.Description title="Type" text={typeLabel} />
      <Form.Description title="Currency" text={position.currency} />
      <Form.Description title="Account" text={accountName} />

      <Form.Separator />

      {/* ── Current Value (read-only) ── */}
      <Form.Description title={currentLabel} text={currentUnitsDisplay} />

      {/* ── Amount to Add ── */}
      <Form.TextField
        id="unitsToAdd"
        title={fieldTitle}
        placeholder={fieldPlaceholder}
        error={unitsError}
        onChange={handleUnitsChange}
        onBlur={handleUnitsBlur}
        autoFocus
      />

      {/* ── New Total Preview ── */}
      <Form.Description
        title="New Total"
        text={
          newTotal !== null
            ? isCash
              ? `${currentUnitsDisplay} + ${formatCurrency(Number(unitsToAdd.trim()), position.currency)} = ${newTotalDisplay}`
              : `${currentUnitsDisplay} + ${unitsToAdd.trim()} = ${newTotalDisplay} units`
            : isCash
              ? `Enter the amount to add to your current ${currentUnitsDisplay} balance.`
              : `Enter the number of units you purchased. They will be added to your current ${currentUnitsDisplay} units.`
        }
      />
    </Form>
  );
}
