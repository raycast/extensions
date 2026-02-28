/**
 * AddCashForm component.
 *
 * A Raycast Form view for adding a cash holding to an investment account.
 * Cash positions differ from securities — they don't have a Yahoo Finance
 * symbol, their price is always 1.0 per unit of their currency, and they
 * only need FX conversion when the cash currency ≠ base currency.
 *
 * The form collects:
 * - Currency (dropdown of major world currencies)
 * - Amount (the cash balance to record)
 *
 * The resulting position is created with `assetType: AssetType.CASH`,
 * a synthetic symbol of the currency code, and `units` equal to the
 * cash amount. The valuation pipeline treats CASH positions specially
 * (price = 1.0, change = 0%, no API call needed).
 *
 * Features:
 * - Currency dropdown with symbols (GBP £, USD $, EUR €, etc.)
 * - Amount field with validation (positive number)
 * - Automatic name generation: "Cash (GBP)", "Cash (USD)", etc.
 * - Toast notification on successful addition
 * - Automatic navigation pop on submission
 *
 * Usage:
 * ```tsx
 * <AddCashForm
 *   accountId={account.id}
 *   accountName={account.name}
 *   onConfirm={async (params) => {
 *     await addPosition(accountId, params);
 *   }}
 * />
 * ```
 */

import React from "react";
import { Form, ActionPanel, Action, Icon, useNavigation, getPreferenceValues } from "@raycast/api";
import { useState } from "react";
import { AssetType, ExtensionPreferences } from "../utils/types";
import { CASH_CURRENCY_OPTIONS } from "../utils/constants";
import { validateUnits, parseUnits } from "../utils/validation";
import { getCurrencySymbol } from "../utils/formatting";

// ──────────────────────────────────────────
// Props
// ──────────────────────────────────────────

interface AddCashFormProps {
  /** The ID of the account to add the cash position to */
  accountId: string;

  /** The name of the target account (for display context) */
  accountName: string;

  /**
   * Callback fired when the form is submitted with valid data.
   * Receives all data needed to create a new CASH Position.
   */
  onConfirm: (params: {
    symbol: string;
    name: string;
    units: number;
    currency: string;
    assetType: AssetType;
  }) => Promise<void>;
}

// ──────────────────────────────────────────
// Component
// ──────────────────────────────────────────

/**
 * Form for adding a cash holding to an account.
 *
 * Renders a Raycast Form with:
 * - A dropdown for selecting the cash currency
 * - A text field for the cash amount
 * - A submit action that creates a CASH position
 *
 * On successful submission, the form automatically navigates back (pops).
 */
export function AddCashForm({ accountId, accountName, onConfirm }: AddCashFormProps): React.JSX.Element {
  // Suppress unused variable lint — accountId is part of the prop contract
  void accountId;

  const { pop } = useNavigation();
  const { baseCurrency } = getPreferenceValues<ExtensionPreferences>();

  // ── Form State ──

  const [currency, setCurrency] = useState<string>(baseCurrency);
  const [amountError, setAmountError] = useState<string | undefined>(undefined);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ── Computed Display ──

  const currencySymbol = getCurrencySymbol(currency);

  // ── Validation ──

  function handleAmountBlur(event: Form.Event<string>) {
    const value = event.target.value;
    if (value && value.trim().length > 0) {
      const error = validateCashAmount(value);
      setAmountError(error);
    }
  }

  function handleAmountChange() {
    if (amountError) {
      setAmountError(undefined);
    }
  }

  // ── Submission ──

  async function handleSubmit(values: { currency: string; amount: string }) {
    // Validate the amount
    const amountValidation = validateCashAmount(values.amount);
    if (amountValidation) {
      setAmountError(amountValidation);
      return;
    }

    const amount = parseUnits(values.amount);
    const selectedCurrency = values.currency;

    setIsSubmitting(true);

    try {
      await onConfirm({
        symbol: selectedCurrency,
        name: `Cash (${selectedCurrency})`,
        units: amount,
        currency: selectedCurrency,
        assetType: AssetType.CASH,
      });
      pop();
    } catch (error) {
      console.error("AddCashForm submission failed:", error);
    } finally {
      setIsSubmitting(false);
    }
  }

  // ── Render ──

  return (
    <Form
      navigationTitle={`Add Cash to ${accountName}`}
      isLoading={isSubmitting}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Add Cash" icon={Icon.BankNote} onSubmit={handleSubmit} />
          <Action title="Cancel" icon={Icon.XMarkCircle} onAction={pop} shortcut={{ modifiers: ["cmd"], key: "." }} />
        </ActionPanel>
      }
    >
      {/* ── Account Context ── */}
      <Form.Description title="Account" text={accountName} />

      <Form.Separator />

      {/* ── Currency Selection ── */}
      <Form.Dropdown id="currency" title="Currency" defaultValue={baseCurrency} onChange={setCurrency}>
        {CASH_CURRENCY_OPTIONS.map((option) => (
          <Form.Dropdown.Item key={option.value} value={option.value} title={option.title} />
        ))}
      </Form.Dropdown>

      {/* ── Amount Input ── */}
      <Form.TextField
        id="amount"
        title="Amount"
        placeholder={`e.g. 500, 1250.50, 10000`}
        error={amountError}
        onChange={handleAmountChange}
        onBlur={handleAmountBlur}
        autoFocus
      />

      <Form.Description
        title=""
        text={`Enter the cash balance in ${currency} (${currencySymbol}). This will be added as a cash holding in your account.`}
      />
    </Form>
  );
}

// ──────────────────────────────────────────
// Validation
// ──────────────────────────────────────────

/**
 * Validates a cash amount input string.
 * Reuses the units validation but with cash-specific error messages.
 */
function validateCashAmount(input: string | undefined): string | undefined {
  const trimmed = (input ?? "").trim();

  if (trimmed.length === 0) {
    return "Cash amount is required";
  }

  // Reuse core numeric validation from validateUnits
  const error = validateUnits(trimmed);
  if (error) {
    // Rephrase generic unit errors for the cash context
    if (error.includes("units")) {
      return error.replace("Units", "Amount").replace("units", "amount");
    }
    return error;
  }

  return undefined;
}
