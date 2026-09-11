/**
 * SearchInvestmentsFlow component.
 *
 * Single-frame flow that orchestrates:
 * 1) Investment search
 * 2) Account selection (with ability to add a new account)
 * 3) Asset confirmation (edit name, units, price)
 *
 * Designed to avoid `pop()` + `push()` in the same callback.
 */

import React from "react";
import { useMemo, useState } from "react";
import { Action, ActionPanel, Form, Icon, useNavigation, getPreferenceValues } from "@raycast/api";
import { Account, AccountType, AssetSearchResult, AssetType } from "../utils/types";
import { SearchInvestmentsView } from "./SearchInvestmentsView";
import { SelectAccountForInvestment } from "./SelectAccountForInvestment";
import { AccountForm } from "./AccountForm";
import { useAssetPrice } from "../hooks/useAssetPrice";
import { useFxRate } from "../hooks/useFxRate";
import { usePortfolio } from "../hooks/usePortfolio";
import { useOptionalPrice } from "../hooks/useOptionalPrice";
import {
  validateAssetName,
  validatePrice,
  validateUnits,
  parseUnits,
  validateTotalValue,
  parseTotalValue,
  computeUnitsFromTotalValue,
} from "../utils/validation";
import { formatCurrency, formatPercent, formatUnits } from "../utils/formatting";
import { ASSET_TYPE_LABELS } from "../utils/constants";

// ──────────────────────────────────────────
// Props
// ──────────────────────────────────────────

export interface SearchInvestmentsFlowProps {
  /**
   * Optional callback fired after a successful add.
   * If omitted, the flow resets back to search so the user can add more.
   */
  onDone?: () => void;
}

// ──────────────────────────────────────────
// Flow State
// ──────────────────────────────────────────

type FlowPhase = "search" | "select-account" | "confirm";

// ──────────────────────────────────────────
// Component
// ──────────────────────────────────────────

export function SearchInvestmentsFlow({ onDone }: SearchInvestmentsFlowProps): React.JSX.Element {
  const { push } = useNavigation();
  const { portfolio, isLoading: isPortfolioLoading, addAccount, addPosition } = usePortfolio();

  const [phase, setPhase] = useState<FlowPhase>("search");
  const [selectedResult, setSelectedResult] = useState<AssetSearchResult | null>(null);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);

  const liveAccounts = portfolio?.accounts ?? [];
  const liveLoading = isPortfolioLoading;

  const selectedAccount = useMemo(
    () => liveAccounts.find((a) => a.id === selectedAccountId) ?? null,
    [liveAccounts, selectedAccountId],
  );

  function handleResetToSearch(): void {
    setPhase("search");
    setSelectedResult(null);
    setSelectedAccountId(null);
  }

  function handleAddAccount(): void {
    push(
      <AccountForm
        onSubmit={async (name: string, type: AccountType) => {
          // addAccount returns the newly created account (with its generated ID).
          // We auto-select it and advance to "confirm" so the user lands directly
          // on the asset details form after creating a new account — no need to
          // manually pick it from the list a second time.
          const newAccount = await addAccount(name, type);
          setSelectedAccountId(newAccount.id);
          setPhase("confirm");
          // AccountForm calls pop() next, revealing SearchInvestmentsFlow which
          // is now already in "confirm" phase with the new account selected.
        }}
      />,
    );
  }

  async function handleConfirmAdd(params: {
    symbol: string;
    name: string;
    units: number;
    currency: string;
    assetType: AssetType;
    priceOverride?: number;
    avgCostPrice?: number;
  }): Promise<void> {
    if (!selectedAccount) return;

    await addPosition(selectedAccount.id, params);

    if (onDone) {
      onDone();
      return;
    }

    handleResetToSearch();
  }

  if (phase === "select-account" && selectedResult) {
    return (
      <SelectAccountForInvestment
        accounts={liveAccounts}
        isLoading={liveLoading}
        onAddAccount={handleAddAccount}
        onSelectAccount={(account) => {
          setSelectedAccountId(account.id);
          setPhase("confirm");
        }}
      />
    );
  }

  if (phase === "confirm" && selectedResult && selectedAccount) {
    return (
      <ConfirmInvestmentForm
        result={selectedResult}
        account={selectedAccount}
        onBack={() => setPhase("select-account")}
        onConfirm={handleConfirmAdd}
      />
    );
  }

  return (
    <SearchInvestmentsView
      onSelectResult={(result) => {
        setSelectedResult(result);
        setPhase("select-account");
      }}
    />
  );
}

// ──────────────────────────────────────────
// Confirmation Form (inline, no navigation pop)
// ──────────────────────────────────────────

interface ConfirmInvestmentFormProps {
  result: AssetSearchResult;
  account: Account;
  onBack: () => void;
  onConfirm: (params: {
    symbol: string;
    name: string;
    units: number;
    currency: string;
    assetType: AssetType;
    priceOverride?: number;
    avgCostPrice?: number;
  }) => Promise<void>;
}

/**
 * Input mode for specifying position size.
 * - "units"  — user enters number of units directly
 * - "value"  — user enters total invested amount, units are auto-calculated
 */
type InputMode = "units" | "value";

function ConfirmInvestmentForm({ result, account, onBack, onConfirm }: ConfirmInvestmentFormProps): React.JSX.Element {
  const { price, isLoading: isPriceLoading, error: priceError } = useAssetPrice(result.symbol);
  const { baseCurrency } = getPreferenceValues<Preferences>();

  const [inputMode, setInputMode] = useState<InputMode>("units");
  const [valueCurrency, setValueCurrency] = useState<string>(baseCurrency);
  const [nameError, setNameError] = useState<string | undefined>(undefined);
  const [unitsError, setUnitsError] = useState<string | undefined>(undefined);
  const [totalValueError, setTotalValueError] = useState<string | undefined>(undefined);
  const [totalValueInput, setTotalValueInput] = useState<string>("");
  const [priceOverrideInput, setPriceOverrideInput] = useState<string>("");
  const [priceOverrideError, setPriceOverrideError] = useState<string | undefined>(undefined);
  const [avgCostInput, setAvgCostInput] = useState<string>("");
  const [avgCostError, setAvgCostError] = useState<string | undefined>(undefined);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const typeLabel = ASSET_TYPE_LABELS[result.type] ?? "Unknown";

  const effectivePrice = useMemo(() => {
    return price?.price ?? 0;
  }, [price]);

  const assetCurrency = price?.currency ?? "";

  // When a buy price is entered, total-value mode divides by it instead of the
  // live price — "amount invested ÷ price paid" recovers the units actually
  // bought, even when the position is being recorded long after the purchase.
  const enteredBuyPrice = useOptionalPrice(avgCostInput);

  // A manual price override also affects the value-mode divisor at submit
  // time (see resolvedPrice in handleSubmit) — mirror that here so the live
  // preview matches what actually gets saved.
  const enteredPriceOverride = useOptionalPrice(priceOverrideInput);

  const valueModeUnitPrice = enteredBuyPrice ?? enteredPriceOverride ?? effectivePrice;

  const valueCurrencyOptions = useMemo(() => {
    const options: Array<{ value: string; title: string }> = [];
    options.push({ value: baseCurrency, title: `${baseCurrency} (Base Currency)` });
    if (assetCurrency && assetCurrency !== baseCurrency) {
      options.push({ value: assetCurrency, title: `${assetCurrency} (Asset Currency)` });
    }
    return options;
  }, [baseCurrency, assetCurrency]);

  const needsFxConversion = assetCurrency !== "" && valueCurrency !== assetCurrency;

  // FX rate: valueCurrency → assetCurrency (only fetched when currencies differ)
  const { rate: fxRate, isLoading: isFxLoading } = useFxRate(
    needsFxConversion ? valueCurrency : undefined,
    needsFxConversion ? assetCurrency : undefined,
  );

  const computedUnitsFromValue = useMemo(() => {
    const trimmed = totalValueInput.trim();
    if (!trimmed || !valueModeUnitPrice) return null;
    const parsed = Number(trimmed);
    if (isNaN(parsed) || parsed <= 0) return null;
    // Convert entered value to asset currency if needed
    const valueInAssetCurrency = needsFxConversion && fxRate ? parsed * fxRate : parsed;
    if (needsFxConversion && !fxRate) return null; // FX rate not yet loaded
    return computeUnitsFromTotalValue(valueInAssetCurrency, valueModeUnitPrice);
  }, [totalValueInput, valueModeUnitPrice, needsFxConversion, fxRate]);

  const computedTotalDisplay = useMemo(() => {
    if (needsFxConversion && !fxRate && totalValueInput.trim()) {
      return "Loading FX rate...";
    }
    if (computedUnitsFromValue === null || !price) return null;
    const priceLabel = enteredBuyPrice
      ? `${formatCurrency(enteredBuyPrice, price.currency)} buy price`
      : enteredPriceOverride
        ? `${formatCurrency(enteredPriceOverride, price.currency)} price override`
        : formatCurrency(price.price, price.currency);
    const total = computedUnitsFromValue * valueModeUnitPrice;
    if (needsFxConversion && fxRate) {
      return `${formatUnits(computedUnitsFromValue)} units × ${priceLabel} = ${formatCurrency(total, price.currency)} (${formatCurrency(Number(totalValueInput.trim()), valueCurrency)} at ${fxRate.toFixed(4)} ${valueCurrency}/${assetCurrency})`;
    }
    return `${formatUnits(computedUnitsFromValue)} units × ${priceLabel} = ${formatCurrency(total, price.currency)}`;
  }, [
    computedUnitsFromValue,
    price,
    enteredBuyPrice,
    enteredPriceOverride,
    valueModeUnitPrice,
    needsFxConversion,
    fxRate,
    totalValueInput,
    valueCurrency,
    assetCurrency,
  ]);

  function handleNameBlur(event: Form.Event<string>) {
    const error = validateAssetName(event.target.value);
    setNameError(error);
  }

  function handleNameChange() {
    if (nameError) setNameError(undefined);
  }

  function handleUnitsBlur(event: Form.Event<string>) {
    if (event.target.value && event.target.value.trim().length > 0) {
      const error = validateUnits(event.target.value);
      setUnitsError(error);
    }
  }

  function handleUnitsChange() {
    if (unitsError) setUnitsError(undefined);
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

  function handlePriceBlur(event: Form.Event<string>) {
    if (event.target.value && event.target.value.trim().length > 0) {
      const error = validatePrice(event.target.value);
      setPriceOverrideError(error);
    }
  }

  function handlePriceChange(value: string) {
    setPriceOverrideInput(value);
    if (priceOverrideError) setPriceOverrideError(undefined);
  }

  function handleAvgCostBlur(event: Form.Event<string>) {
    if (event.target.value && event.target.value.trim().length > 0) {
      setAvgCostError(validatePrice(event.target.value));
    }
  }

  function handleAvgCostChange(value: string) {
    setAvgCostInput(value);
    if (avgCostError) setAvgCostError(undefined);
  }

  function handleInputModeChange(value: string) {
    setInputMode(value as InputMode);
    setUnitsError(undefined);
    setTotalValueError(undefined);
  }

  async function handleSubmit(values: {
    name: string;
    units?: string;
    totalValue?: string;
    priceOverride?: string;
    avgCostPrice?: string;
    inputMode: string;
    valueCurrency?: string;
  }) {
    const nameValidation = validateAssetName(values.name);
    if (nameValidation) {
      setNameError(nameValidation);
      return;
    }

    const priceOverrideValue = values.priceOverride?.trim();
    if (priceOverrideValue) {
      const priceValidation = validatePrice(priceOverrideValue);
      if (priceValidation) {
        setPriceOverrideError(priceValidation);
        return;
      }
    }

    const avgCostValue = values.avgCostPrice?.trim();
    if (avgCostValue) {
      const avgCostValidation = validatePrice(avgCostValue);
      if (avgCostValidation) {
        setAvgCostError(avgCostValidation);
        return;
      }
    }

    if (!price) {
      if (inputMode === "units") {
        setUnitsError("Price data not yet available. Please wait a moment.");
      } else {
        setTotalValueError("Price data not yet available. Please wait a moment.");
      }
      return;
    }

    const resolvedPrice = priceOverrideValue ? parseUnits(priceOverrideValue) : price.price;
    let finalUnits: number;

    if (inputMode === "value") {
      const tvValidation = validateTotalValue(values.totalValue);
      if (tvValidation) {
        setTotalValueError(tvValidation);
        return;
      }

      if (needsFxConversion && !fxRate) {
        setTotalValueError("FX rate not available yet. Please wait a moment.");
        return;
      }

      const rawTotalValue = parseTotalValue(values.totalValue!);
      const totalValueInAssetCurrency = needsFxConversion && fxRate ? rawTotalValue * fxRate : rawTotalValue;
      // Divide by the buy price when entered ("amount invested ÷ price paid"),
      // otherwise by the current/override price ("buying at today's price").
      const buyPrice = avgCostValue ? Number(avgCostValue) : undefined;
      finalUnits = computeUnitsFromTotalValue(totalValueInAssetCurrency, buyPrice ?? resolvedPrice);
      if (finalUnits <= 0) {
        setTotalValueError("Computed units would be zero — check the price and total value.");
        return;
      }
    } else {
      const unitValidation = validateUnits(values.units);
      if (unitValidation) {
        setUnitsError(unitValidation);
        return;
      }
      finalUnits = parseUnits(values.units!);
    }

    setIsSubmitting(true);

    try {
      await onConfirm({
        symbol: result.symbol,
        name: values.name.trim(),
        units: finalUnits,
        currency: price.currency,
        assetType: result.type,
        priceOverride: priceOverrideValue ? parseUnits(priceOverrideValue) : undefined,
        avgCostPrice: avgCostValue ? Number(avgCostValue) : undefined,
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  const priceDisplay = price
    ? formatCurrency(price.price, price.currency)
    : isPriceLoading
      ? "Loading..."
      : "Unavailable";

  const changeDisplay = price
    ? `${formatCurrency(price.change, price.currency, { showSign: true })} (${formatPercent(price.changePercent)})`
    : "";

  return (
    <Form
      navigationTitle={`Add ${result.name}`}
      isLoading={isPriceLoading || isFxLoading || isSubmitting}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Add to Portfolio" icon={Icon.PlusCircle} onSubmit={handleSubmit} />
          <Action title="Back" icon={Icon.ArrowLeft} onAction={onBack} shortcut={{ modifiers: ["cmd"], key: "[" }} />
        </ActionPanel>
      }
    >
      {/* ── Asset Information (read-only) ── */}
      <Form.Description title="Asset" text={result.name} />
      <Form.Description title="Symbol" text={result.symbol} />
      <Form.Description title="Type" text={`${typeLabel} · ${result.exchange}`} />
      <Form.Description title="Price" text={priceDisplay} />

      {price && price.change !== 0 && <Form.Description title="Day Change" text={changeDisplay} />}

      {priceError && <Form.Description title="⚠️ Warning" text={`Price data may be stale: ${priceError.message}`} />}

      <Form.Separator />

      {/* ── Editable Asset Fields ── */}
      <Form.TextField
        id="name"
        title="Asset Name"
        defaultValue={price?.name ?? result.name}
        error={nameError}
        onChange={handleNameChange}
        onBlur={handleNameBlur}
      />

      <Form.TextField
        id="priceOverride"
        title="Price per Unit"
        placeholder={price ? formatCurrency(price.price, price.currency) : "e.g. 72.50"}
        error={priceOverrideError}
        onChange={handlePriceChange}
        onBlur={handlePriceBlur}
      />

      <Form.Description
        title=""
        text={
          price
            ? `Leave blank to use the live price (${formatCurrency(price.price, price.currency)}).`
            : "Enter a price per unit (optional)."
        }
      />

      <Form.TextField
        id="avgCostPrice"
        title="Average Buy Price"
        placeholder={price ? `e.g. ${formatCurrency(price.price, price.currency)} (optional)` : "e.g. 72.50 (optional)"}
        error={avgCostError}
        onChange={handleAvgCostChange}
        onBlur={handleAvgCostBlur}
      />

      <Form.Description
        title=""
        text={`Optional. The average price per unit you paid${price ? ` in ${price.currency}` : ""}. Enables profit/loss tracking.`}
      />

      {/* ── Input Mode Toggle ── */}
      <Form.Description title="Account" text={account.name} />

      <Form.Dropdown id="inputMode" title="Specify By" value={inputMode} onChange={handleInputModeChange}>
        <Form.Dropdown.Item value="units" title="Number of Units" icon={Icon.Hashtag} />
        <Form.Dropdown.Item value="value" title="Total Value Invested" icon={Icon.BankNote} />
      </Form.Dropdown>

      {/* ── Currency Selector (value mode only) ── */}
      {inputMode === "value" && (
        <Form.Dropdown id="valueCurrency" title="Value Currency" value={valueCurrency} onChange={setValueCurrency}>
          {valueCurrencyOptions.map((opt) => (
            <Form.Dropdown.Item key={opt.value} value={opt.value} title={opt.title} />
          ))}
        </Form.Dropdown>
      )}

      {/* ── Units Input (direct mode) ── */}
      {inputMode === "units" && (
        <>
          <Form.TextField
            id="units"
            title="Number of Units"
            placeholder="e.g. 50, 12.5, 0.25"
            error={unitsError}
            onChange={handleUnitsChange}
            onBlur={handleUnitsBlur}
            autoFocus
          />

          <Form.Description
            title=""
            text={price ? `Each unit is currently worth ${formatCurrency(price.price, price.currency)}` : ""}
          />
        </>
      )}

      {/* ── Total Value Input (value mode) ── */}
      {inputMode === "value" && (
        <>
          <Form.TextField
            id="totalValue"
            title="Total Value Invested"
            placeholder={`e.g. 1000, 5000, 25000 (${valueCurrency})`}
            error={totalValueError}
            onChange={handleTotalValueChange}
            onBlur={handleTotalValueBlur}
            autoFocus
          />

          <Form.Description
            title=""
            text={
              computedTotalDisplay
                ? `→ ${computedTotalDisplay}`
                : price
                  ? (() => {
                      const divisorLabel = enteredBuyPrice
                        ? `your buy price (${formatCurrency(enteredBuyPrice, price.currency)})`
                        : enteredPriceOverride
                          ? `your price override (${formatCurrency(enteredPriceOverride, price.currency)})`
                          : `${formatCurrency(price.price, price.currency)}/unit`;
                      return needsFxConversion
                        ? `Enter total amount in ${valueCurrency}. Will be converted to ${assetCurrency} then divided by ${divisorLabel}.`
                        : `Enter total amount invested in ${valueCurrency}. Units will be auto-calculated at ${divisorLabel} per unit.`;
                    })()
                  : "Enter total amount invested. Units will be calculated from your buy price (if entered), your price override (if entered), or the current price."
            }
          />
        </>
      )}
    </Form>
  );
}
