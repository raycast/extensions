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
 *   onSubmit={async (newTotalUnits, newAvgCostPrice) => {
 *     await updatePosition(account.id, position.id, { units: newTotalUnits, avgCostPrice: newAvgCostPrice });
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
  validatePrice,
} from "../utils/validation";
import { formatUnits, formatCurrency, getDisplayName } from "../utils/formatting";
import { computeWeightedAvgCost } from "../utils/pnl";
import { useAssetPrice } from "../hooks/useAssetPrice";
import { useFxRate } from "../hooks/useFxRate";
import { useOptionalPrice } from "../hooks/useOptionalPrice";

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
   * @param newAvgCostPrice - The updated average buy price (weighted), or
   *   undefined when the user didn't enter a price paid (cost stays unchanged)
   */
  onSubmit: (newTotalUnits: number, newAvgCostPrice?: number) => Promise<void>;
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
  const [pricePaidInput, setPricePaidInput] = useState<string>("");
  const [pricePaidError, setPricePaidError] = useState<string | undefined>(undefined);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // When a price paid is entered, value mode divides by it instead of the
  // current price — "amount invested ÷ price paid" recovers the units bought.
  const enteredPricePaid = useOptionalPrice(pricePaidInput);

  const valueModeUnitPrice = enteredPricePaid ?? referencePrice;

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
    if (!trimmed || !valueModeUnitPrice) return null;
    const parsed = Number(trimmed);
    if (isNaN(parsed) || parsed <= 0) return null;
    const valueInAssetCurrency = needsFxConversion && fxRate ? parsed * fxRate : parsed;
    if (needsFxConversion && !fxRate) return null;
    return computeUnitsFromTotalValue(valueInAssetCurrency, valueModeUnitPrice);
  }, [totalValueInput, valueModeUnitPrice, needsFxConversion, fxRate]);

  const newTotalFromValue = useMemo(() => {
    if (computedUnitsFromValue === null) return null;
    return position.units + computedUnitsFromValue;
  }, [computedUnitsFromValue, position.units]);

  const valuePreviewText = useMemo(() => {
    if (needsFxConversion && !fxRate && totalValueInput.trim()) {
      return "Loading FX rate...";
    }
    if (computedUnitsFromValue === null || newTotalFromValue === null) {
      const priceHint = enteredPricePaid
        ? `your price paid (${formatCurrency(enteredPricePaid, position.currency)})`
        : `${formatCurrency(referencePrice, position.currency)}/unit`;
      return needsFxConversion
        ? `Enter the total amount to invest in ${valueCurrency}. Will be converted to ${position.currency} then divided by ${priceHint}.`
        : `Enter the total amount to invest in ${valueCurrency}. Units will be calculated at ${priceHint}.`;
    }
    const priceLabel = enteredPricePaid
      ? `${formatCurrency(enteredPricePaid, position.currency)} paid`
      : formatCurrency(referencePrice, position.currency);
    const nativeAdded = computedUnitsFromValue * valueModeUnitPrice;
    if (needsFxConversion && fxRate) {
      return `→ ${formatUnits(computedUnitsFromValue)} units × ${priceLabel} = ${formatCurrency(nativeAdded, position.currency)} (${formatCurrency(Number(totalValueInput.trim()), valueCurrency)} at ${fxRate.toFixed(4)} ${valueCurrency}/${position.currency})\n${currentUnitsDisplay} + ${formatUnits(computedUnitsFromValue)} = ${formatUnits(newTotalFromValue)} units`;
    }
    return `→ ${formatUnits(computedUnitsFromValue)} units × ${priceLabel} = ${formatCurrency(nativeAdded, position.currency)}\n${currentUnitsDisplay} + ${formatUnits(computedUnitsFromValue)} = ${formatUnits(newTotalFromValue)} units`;
  }, [
    computedUnitsFromValue,
    newTotalFromValue,
    referencePrice,
    enteredPricePaid,
    valueModeUnitPrice,
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

  function handlePricePaidBlur(event: Form.Event<string>) {
    if (event.target.value && event.target.value.trim().length > 0) {
      setPricePaidError(validatePrice(event.target.value));
    }
  }

  function handlePricePaidChange(value: string) {
    setPricePaidInput(value);
    if (pricePaidError) setPricePaidError(undefined);
  }

  // ── Submission ──

  async function handleSubmit(values: {
    unitsToAdd?: string;
    totalValueToAdd?: string;
    inputMode?: string;
    valueCurrency?: string;
    pricePaid?: string;
  }) {
    let addedUnits: number;

    // Validate the optional price paid (native currency)
    const trimmedPricePaid = values.pricePaid?.trim() ?? "";
    if (!isCash && trimmedPricePaid) {
      const priceValidation = validatePrice(trimmedPricePaid);
      if (priceValidation) {
        setPricePaidError(priceValidation);
        return;
      }
    }

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
      // Divide by the price paid when entered ("amount invested ÷ price paid"),
      // otherwise by the current price ("buying at today's price").
      const paidPrice = trimmedPricePaid ? Number(trimmedPricePaid) : undefined;
      addedUnits = computeUnitsFromTotalValue(totalValueInAssetCurrency, paidPrice ?? referencePrice);
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

    // Update the average buy price (weighted) when a price paid is provided
    const newAvgCostPrice =
      !isCash && trimmedPricePaid
        ? computeWeightedAvgCost(position.units, position.avgCostPrice, addedUnits, Number(trimmedPricePaid))
        : undefined;

    setIsSubmitting(true);

    try {
      await onSubmit(computedTotal, newAvgCostPrice);
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

      {/* ── Price Paid (optional, non-cash — updates average buy price) ── */}
      {!isCash && (
        <>
          <Form.Separator />

          <Form.TextField
            id="pricePaid"
            title="Price Paid per Unit"
            placeholder={
              referencePrice > 0
                ? `e.g. ${formatCurrency(referencePrice, position.currency)} (optional)`
                : `e.g. 72.50 (${position.currency}, optional)`
            }
            error={pricePaidError}
            onChange={handlePricePaidChange}
            onBlur={handlePricePaidBlur}
          />

          <Form.Description
            title=""
            text={
              position.avgCostPrice !== undefined
                ? `Optional. Updates your average buy price (currently ${formatCurrency(position.avgCostPrice, position.currency)}) using a weighted average. Leave empty to keep it unchanged.`
                : `Optional. Applies this price as the average buy price for your ENTIRE holding — including the ${formatUnits(position.units)} units you already hold, not just the ones added now — and enables profit/loss tracking.`
            }
          />
        </>
      )}
    </Form>
  );
}
