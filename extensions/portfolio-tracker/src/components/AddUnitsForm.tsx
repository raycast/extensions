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
import { Form, ActionPanel, Action, Icon, useNavigation, getPreferenceValues } from "@raycast/api";
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
import { formatUnits, formatCurrency, getDisplayName } from "../utils/formatting";
import { useAssetPrice } from "../hooks/useAssetPrice";
import { useFxRate } from "../hooks/useFxRate";

// ──────────────────────────────────────────
// Input Mode
// ──────────────────────────────────────────

/**
 * Input mode for specifying additional position size.
 * - "units"  — user enters number of units to add
 * - "value"  — user enters total value to add, units are auto-calculated from current price
 */
type AddInputMode = "units" | "value";

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

  // ── Price Data (for total-value mode) ──

  const isCash = position.assetType === AssetType.CASH;
  const symbol = isCash ? undefined : position.symbol;
  const { price, isLoading: isPriceLoading } = useAssetPrice(symbol);
  const { baseCurrency } = getPreferenceValues<Preferences>();

  const referencePrice = useMemo(() => {
    if (position.priceOverride && position.priceOverride > 0) return position.priceOverride;
    return price?.price ?? 0;
  }, [position.priceOverride, price]);

  const hasPriceForValueMode = !isCash && referencePrice > 0;

  // ── Currency options for value mode ──

  const valueCurrencyOptions = useMemo(() => {
    const options: Array<{ value: string; title: string }> = [];
    options.push({ value: baseCurrency, title: `${baseCurrency} (Base Currency)` });
    if (position.currency !== baseCurrency) {
      options.push({ value: position.currency, title: `${position.currency} (Asset Currency)` });
    }
    return options;
  }, [baseCurrency, position.currency]);

  // ── Form State ──

  const [inputMode, setInputMode] = useState<AddInputMode>("units");
  const [valueCurrency, setValueCurrency] = useState<string>(baseCurrency);
  const [unitsToAdd, setUnitsToAdd] = useState<string>("");
  const [unitsError, setUnitsError] = useState<string | undefined>(undefined);
  const [totalValueInput, setTotalValueInput] = useState<string>("");
  const [totalValueError, setTotalValueError] = useState<string | undefined>(undefined);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const needsFxConversion = valueCurrency !== position.currency;

  // FX rate: valueCurrency → assetCurrency (only fetched when currencies differ)
  const { rate: fxRate, isLoading: isFxLoading } = useFxRate(
    needsFxConversion ? valueCurrency : undefined,
    needsFxConversion ? position.currency : undefined,
  );

  // ── Display Values ──

  const typeLabel = ASSET_TYPE_LABELS[position.assetType] ?? "Unknown";
  const currentUnitsDisplay = isCash ? formatCurrency(position.units, position.currency) : formatUnits(position.units);

  // Context-aware labels
  const displayName = getDisplayName(position);
  const navTitle = isCash ? `Add Cash — ${displayName}` : `Add Units — ${displayName}`;
  const submitTitle = isCash ? "Add Cash" : "Add Units";
  const fieldTitle = isCash ? "Amount to Add" : "Units to Add";
  const fieldPlaceholder = isCash ? "e.g. 500, 1250.50, 10000" : "e.g. 10, 5.5, 0.25";
  const currentLabel = isCash ? "Current Balance" : "Current Units";

  // ── Computed New Total (units mode) ──

  const newTotal = useMemo(() => {
    const trimmed = unitsToAdd.trim();
    if (trimmed.length === 0) return null;
    const parsed = Number(trimmed);
    if (isNaN(parsed) || parsed <= 0) return null;
    return position.units + parsed;
  }, [unitsToAdd, position.units]);

  const newTotalDisplay =
    newTotal !== null ? (isCash ? formatCurrency(newTotal, position.currency) : formatUnits(newTotal)) : "—";

  // ── Computed New Total (value mode) ──

  const computedUnitsFromValue = useMemo(() => {
    const trimmed = totalValueInput.trim();
    if (!trimmed || !referencePrice) return null;
    const parsed = Number(trimmed);
    if (isNaN(parsed) || parsed <= 0) return null;
    const valueInAssetCurrency = needsFxConversion && fxRate ? parsed * fxRate : parsed;
    if (needsFxConversion && !fxRate) return null;
    return computeUnitsFromTotalValue(valueInAssetCurrency, referencePrice);
  }, [totalValueInput, referencePrice, needsFxConversion, fxRate]);

  const newTotalFromValue = useMemo(() => {
    if (computedUnitsFromValue === null) return null;
    return position.units + computedUnitsFromValue;
  }, [computedUnitsFromValue, position.units]);

  const valuePreviewText = useMemo(() => {
    if (needsFxConversion && !fxRate && totalValueInput.trim()) {
      return "Loading FX rate...";
    }
    if (computedUnitsFromValue === null || newTotalFromValue === null) {
      return needsFxConversion
        ? `Enter the total amount to invest in ${valueCurrency}. Will be converted to ${position.currency} then divided by ${formatCurrency(referencePrice, position.currency)}/unit.`
        : `Enter the total amount to invest in ${valueCurrency}. Units will be calculated at ${formatCurrency(referencePrice, position.currency)}/unit.`;
    }
    const nativeAdded = computedUnitsFromValue * referencePrice;
    if (needsFxConversion && fxRate) {
      return `→ ${formatUnits(computedUnitsFromValue)} units × ${formatCurrency(referencePrice, position.currency)} = ${formatCurrency(nativeAdded, position.currency)} (${formatCurrency(Number(totalValueInput.trim()), valueCurrency)} at ${fxRate.toFixed(4)} ${valueCurrency}/${position.currency})\n${currentUnitsDisplay} + ${formatUnits(computedUnitsFromValue)} = ${formatUnits(newTotalFromValue)} units`;
    }
    return `→ ${formatUnits(computedUnitsFromValue)} units × ${formatCurrency(referencePrice, position.currency)} = ${formatCurrency(nativeAdded, position.currency)}\n${currentUnitsDisplay} + ${formatUnits(computedUnitsFromValue)} = ${formatUnits(newTotalFromValue)} units`;
  }, [
    computedUnitsFromValue,
    newTotalFromValue,
    referencePrice,
    position.currency,
    currentUnitsDisplay,
    needsFxConversion,
    fxRate,
    totalValueInput,
    valueCurrency,
  ]);

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
    setInputMode(value as AddInputMode);
    setUnitsError(undefined);
    setTotalValueError(undefined);
  }

  // ── Submission ──

  async function handleSubmit(values: {
    unitsToAdd?: string;
    totalValueToAdd?: string;
    inputMode?: string;
    valueCurrency?: string;
  }) {
    let addedUnits: number;

    if (!isCash && inputMode === "value") {
      const tvValidation = validateTotalValue(values.totalValueToAdd);
      if (tvValidation) {
        setTotalValueError(tvValidation);
        return;
      }

      if (needsFxConversion && !fxRate) {
        setTotalValueError("FX rate not available yet. Please wait a moment.");
        return;
      }

      const totalValue = parseTotalValue(values.totalValueToAdd!);
      const totalValueInAssetCurrency = needsFxConversion && fxRate ? totalValue * fxRate : totalValue;
      addedUnits = computeUnitsFromTotalValue(totalValueInAssetCurrency, referencePrice);
      if (addedUnits <= 0) {
        setTotalValueError("Computed units would be zero — check the price and total value.");
        return;
      }
    } else {
      const unitValidation = validateUnits(values.unitsToAdd);
      if (unitValidation) {
        setUnitsError(unitValidation);
        return;
      }
      addedUnits = parseUnits(values.unitsToAdd!);
    }

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
      isLoading={isSubmitting || isPriceLoading || isFxLoading}
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

      {/* ── Input Mode Toggle (non-cash with price only) ── */}
      {hasPriceForValueMode && (
        <Form.Dropdown id="inputMode" title="Specify By" value={inputMode} onChange={handleInputModeChange}>
          <Form.Dropdown.Item value="units" title="Number of Units" icon={Icon.Hashtag} />
          <Form.Dropdown.Item value="value" title="Amount to Invest" icon={Icon.BankNote} />
        </Form.Dropdown>
      )}

      {/* ── Units to Add (default mode) ── */}
      {(isCash || inputMode === "units") && (
        <>
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
        </>
      )}

      {/* ── Total Value to Add (value mode) ── */}
      {!isCash && inputMode === "value" && (
        <>
          {/* ── Currency Selector ── */}
          <Form.Dropdown id="valueCurrency" title="Value Currency" value={valueCurrency} onChange={setValueCurrency}>
            {valueCurrencyOptions.map((opt) => (
              <Form.Dropdown.Item key={opt.value} value={opt.value} title={opt.title} />
            ))}
          </Form.Dropdown>

          <Form.TextField
            id="totalValueToAdd"
            title="Amount to Invest"
            placeholder={`e.g. 500, 1000, 5000 (${valueCurrency})`}
            error={totalValueError}
            onChange={handleTotalValueChange}
            onBlur={handleTotalValueBlur}
            autoFocus
          />

          <Form.Description title="" text={valuePreviewText} />
        </>
      )}
    </Form>
  );
}
