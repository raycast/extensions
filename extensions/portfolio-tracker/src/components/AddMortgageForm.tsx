/**
 * AddMortgageForm component.
 *
 * A Raycast Form view for adding a property (mortgage or owned outright)
 * to a Property account. Collects all data needed for HPI-based valuation
 * and optional mortgage amortization tracking.
 *
 * The form adapts based on the selected property type:
 * - **Mortgage**: Shows all fields including equity, rate, term, start date
 * - **Owned Outright**: Hides mortgage-specific fields; equity = total value
 *
 * Fields:
 * - Property Name (free text, e.g. "123 Baker Street")
 * - Property Type (Mortgage / Owned Outright)
 * - Total Property Value (at valuation)
 * - Current Equity (Mortgage only — for Owned Outright, equals total value)
 * - Valuation Date (date picker)
 * - Postcode (UK postcode for HPI lookup)
 * - Mortgage Interest Rate % (optional, Mortgage only)
 * - Mortgage Term in years (optional, Mortgage only)
 * - Mortgage Start Date (optional, Mortgage only)
 *
 * On submission, creates a Position with the appropriate AssetType and
 * MortgageData, then navigates back.
 *
 * Usage:
 * ```tsx
 * <AddMortgageForm
 *   accountId={account.id}
 *   accountName={account.name}
 *   baseCurrency="GBP"
 *   onConfirm={async (params) => {
 *     await addPosition(accountId, params);
 *   }}
 * />
 * ```
 */

import React from "react";
import { Form, ActionPanel, Action, Icon, useNavigation, showToast, Toast } from "@raycast/api";
import { useState } from "react";
import { AssetType, MortgageData } from "../utils/types";
import { validatePostcodeFormat } from "../services/property-price";
import { getCurrencySymbol } from "../utils/formatting";

// ──────────────────────────────────────────
// Props
// ──────────────────────────────────────────

interface AddMortgageFormProps {
  /** The ID of the account to add the property position to */
  accountId: string;

  /** The name of the target account (for display context) */
  accountName: string;

  /** The user's base currency code (e.g. "GBP") */
  baseCurrency: string;

  /**
   * Callback fired when the form is submitted with valid data.
   * Receives all data needed to create a new MORTGAGE or OWNED_PROPERTY Position.
   */
  onConfirm: (params: {
    symbol: string;
    name: string;
    units: number;
    currency: string;
    assetType: AssetType;
    mortgageData: MortgageData;
  }) => Promise<void>;
}

// ──────────────────────────────────────────
// Property Type Options
// ──────────────────────────────────────────

const PROPERTY_TYPE_OPTIONS = [
  { value: AssetType.MORTGAGE, title: "🏠 Mortgage" },
  { value: AssetType.OWNED_PROPERTY, title: "🏡 Owned Outright" },
];

// ──────────────────────────────────────────
// Component
// ──────────────────────────────────────────

/**
 * Form for adding a property holding to an account.
 *
 * Renders a Raycast Form with adaptive fields based on the selected
 * property type. Mortgage type shows additional fields for tracking
 * principal repayment over time.
 *
 * On successful submission, the form automatically navigates back (pops).
 */
export function AddMortgageForm({
  accountId,
  accountName,
  baseCurrency,
  onConfirm,
}: AddMortgageFormProps): React.JSX.Element {
  // Suppress unused variable lint — accountId is part of the prop contract
  void accountId;

  const { pop } = useNavigation();
  const currencySymbol = getCurrencySymbol(baseCurrency);

  // ── Form State ──

  const [propertyType, setPropertyType] = useState<string>(AssetType.MORTGAGE);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ── Error State ──

  const [nameError, setNameError] = useState<string | undefined>();
  const [valueError, setValueError] = useState<string | undefined>();
  const [equityError, setEquityError] = useState<string | undefined>();
  const [postcodeError, setPostcodeError] = useState<string | undefined>();
  const [rateError, setRateError] = useState<string | undefined>();
  const [termError, setTermError] = useState<string | undefined>();
  const [sharedOwnershipError, setSharedOwnershipError] = useState<string | undefined>();
  const [myEquityShareError, setMyEquityShareError] = useState<string | undefined>();

  // ── Derived State ──

  const isMortgage = propertyType === AssetType.MORTGAGE;

  // ── Validation Helpers ──

  function validateRequired(value: string, fieldName: string): string | undefined {
    if (!value || value.trim().length === 0) {
      return `${fieldName} is required`;
    }
    return undefined;
  }

  function validatePositiveNumber(value: string, fieldName: string): string | undefined {
    const trimmed = (value ?? "").trim();
    if (trimmed.length === 0) return `${fieldName} is required`;
    const num = Number(trimmed);
    if (isNaN(num) || !isFinite(num)) return "Must be a valid number";
    if (num <= 0) return `${fieldName} must be greater than zero`;
    return undefined;
  }

  function validatePercentage(value: string, fieldName: string): string | undefined {
    const trimmed = (value ?? "").trim();
    if (trimmed.length === 0) return undefined; // optional field
    const num = Number(trimmed);
    if (isNaN(num) || !isFinite(num)) return "Must be a valid number";
    if (num < 0 || num > 100) return `${fieldName} must be between 0 and 100`;
    return undefined;
  }

  function validateTerm(value: string): string | undefined {
    const trimmed = (value ?? "").trim();
    if (trimmed.length === 0) return undefined; // optional field
    const num = Number(trimmed);
    if (isNaN(num) || !isFinite(num) || !Number.isInteger(num)) return "Must be a whole number";
    if (num < 1 || num > 50) return "Term must be between 1 and 50 years";
    return undefined;
  }

  function validateNonNegativeNumber(value: string, fieldName: string): string | undefined {
    const trimmed = (value ?? "").trim();
    if (trimmed.length === 0) return undefined; // optional field
    const num = Number(trimmed);
    if (isNaN(num) || !isFinite(num)) return "Must be a valid number";
    if (num < 0) return `${fieldName} cannot be negative`;
    return undefined;
  }

  // ── Submission ──

  async function handleSubmit(values: {
    propertyName: string;
    propertyType: string;
    totalValue: string;
    equity: string;
    valuationDate: Date | null;
    postcode: string;
    mortgageRate: string;
    mortgageTerm: string;
    mortgageStartDate: Date | null;
    sharedOwnership: string;
    myEquityShare: string;
  }) {
    // ── Validate required fields ──

    const nameErr = validateRequired(values.propertyName, "Property name");
    if (nameErr) {
      setNameError(nameErr);
      return;
    }

    const valErr = validatePositiveNumber(values.totalValue, "Total property value");
    if (valErr) {
      setValueError(valErr);
      return;
    }

    const totalValue = Number(values.totalValue.trim());
    const selectedType = values.propertyType as AssetType;
    const isMortgageType = selectedType === AssetType.MORTGAGE;

    // Equity validation (only for mortgage)
    let equity = totalValue; // default for owned outright
    if (isMortgageType) {
      const eqErr = validatePositiveNumber(values.equity, "Current equity");
      if (eqErr) {
        setEquityError(eqErr);
        return;
      }
      equity = Number(values.equity.trim());
      if (equity > totalValue) {
        setEquityError("Equity cannot exceed total property value");
        return;
      }
    }

    // Valuation date
    if (!values.valuationDate) {
      await showToast({ style: Toast.Style.Failure, title: "Valuation date is required" });
      return;
    }
    const valuationDate = values.valuationDate.toISOString().split("T")[0];

    // Validate valuation date is not in the future
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    if (values.valuationDate > today) {
      await showToast({ style: Toast.Style.Failure, title: "Valuation date cannot be in the future" });
      return;
    }

    // Postcode validation
    const pcErr = validatePostcodeFormat(values.postcode);
    if (pcErr) {
      setPostcodeError(pcErr);
      return;
    }
    const postcode = values.postcode.trim().toUpperCase();

    // ── Optional mortgage detail fields ──

    let mortgageRate: number | undefined;
    let mortgageTerm: number | undefined;
    let mortgageStartDate: string | undefined;

    if (isMortgageType) {
      // Validate rate if provided
      const rateErr = validatePercentage(values.mortgageRate, "Interest rate");
      if (rateErr) {
        setRateError(rateErr);
        return;
      }

      // Validate term if provided
      const tErr = validateTerm(values.mortgageTerm);
      if (tErr) {
        setTermError(tErr);
        return;
      }

      const hasRate = values.mortgageRate?.trim().length > 0;
      const hasTerm = values.mortgageTerm?.trim().length > 0;
      const hasStartDate = !!values.mortgageStartDate;

      // If any of the three detail fields is provided, all three should be
      const detailFieldCount = [hasRate, hasTerm, hasStartDate].filter(Boolean).length;
      if (detailFieldCount > 0 && detailFieldCount < 3) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Incomplete Mortgage Details",
          message: "Please provide all three: interest rate, term, and start date — or leave all empty.",
        });
        return;
      }

      if (detailFieldCount === 3) {
        mortgageRate = Number(values.mortgageRate.trim());
        mortgageTerm = Number(values.mortgageTerm.trim());
        mortgageStartDate = values.mortgageStartDate!.toISOString().split("T")[0];
      }
    }

    // ── Shared ownership & reserved equity (optional) ──

    let sharedOwnershipPercent: number | undefined;
    let myEquityShare: number | undefined;

    const soErr = validatePercentage(values.sharedOwnership, "Shared ownership");
    if (soErr) {
      setSharedOwnershipError(soErr);
      return;
    }
    if (values.sharedOwnership?.trim().length > 0) {
      const soVal = Number(values.sharedOwnership.trim());
      if (soVal > 0 && soVal < 100) {
        sharedOwnershipPercent = soVal;
      }
      // 100% or 0 are effectively "no split" or "no ownership" — store only meaningful values
    }

    const meErr = validateNonNegativeNumber(values.myEquityShare, "My share of equity");
    if (meErr) {
      setMyEquityShareError(meErr);
      return;
    }
    if (values.myEquityShare?.trim().length > 0) {
      const meVal = Number(values.myEquityShare.trim());
      if (meVal > 0) {
        if (meVal > equity) {
          setMyEquityShareError("Your share cannot exceed total equity");
          return;
        }
        myEquityShare = meVal;
      }
    }

    // ── Build mortgage data ──

    const mortgageData: MortgageData = {
      totalPropertyValue: totalValue,
      equity,
      valuationDate,
      postcode,
      ...(mortgageRate !== undefined && { mortgageRate }),
      ...(mortgageTerm !== undefined && { mortgageTerm }),
      ...(mortgageStartDate !== undefined && { mortgageStartDate }),
      ...(sharedOwnershipPercent !== undefined && { sharedOwnershipPercent }),
      ...(myEquityShare !== undefined && { myEquityShare }),
    };

    // ── Submit ──

    setIsSubmitting(true);

    try {
      // Use a synthetic symbol: PROPERTY:{postcode_normalised}
      const normalisedPostcode = postcode.replace(/\s+/g, "");
      const symbol = `PROPERTY:${normalisedPostcode}`;
      const name = values.propertyName.trim();

      await onConfirm({
        symbol,
        name,
        units: 1, // one property = one unit
        currency: baseCurrency,
        assetType: selectedType,
        mortgageData,
      });

      pop();
    } catch (error) {
      console.error("AddMortgageForm submission failed:", error);
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to Add Property",
        message: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  // ── Render ──

  return (
    <Form
      navigationTitle={`Add Property to ${accountName}`}
      isLoading={isSubmitting}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Add Property" icon={Icon.House} onSubmit={handleSubmit} />
          <Action title="Cancel" icon={Icon.XMarkCircle} onAction={pop} shortcut={{ modifiers: ["cmd"], key: "." }} />
        </ActionPanel>
      }
    >
      {/* ── Account Context ── */}
      <Form.Description title="Account" text={accountName} />

      <Form.Separator />

      {/* ── Property Name ── */}
      <Form.TextField
        id="propertyName"
        title="Property Name"
        placeholder='e.g. "123 Baker Street" or "Family Home"'
        error={nameError}
        onChange={() => nameError && setNameError(undefined)}
        autoFocus
      />

      {/* ── Property Type ── */}
      <Form.Dropdown
        id="propertyType"
        title="Property Type"
        defaultValue={AssetType.MORTGAGE}
        onChange={setPropertyType}
      >
        {PROPERTY_TYPE_OPTIONS.map((option) => (
          <Form.Dropdown.Item key={option.value} value={option.value} title={option.title} />
        ))}
      </Form.Dropdown>

      <Form.Separator />

      {/* ── Valuation Details ── */}

      <Form.TextField
        id="totalValue"
        title={`Total Property Value (${currencySymbol})`}
        placeholder="e.g. 350000"
        error={valueError}
        onChange={() => valueError && setValueError(undefined)}
        info="The full market value of the property at the time of valuation."
      />

      {isMortgage && (
        <Form.TextField
          id="equity"
          title={`Current Equity (${currencySymbol})`}
          placeholder="e.g. 100000"
          error={equityError}
          onChange={() => equityError && setEquityError(undefined)}
          info="Your ownership stake in the property — typically your deposit plus any principal repaid. The remaining amount is your outstanding mortgage."
        />
      )}

      {/* Hidden equity field for owned outright — ensures form values always include equity */}
      {!isMortgage && <Form.TextField id="equity" title="" value="0" />}

      <Form.DatePicker
        id="valuationDate"
        title="Valuation Date"
        info="The date when the property was last valued. Used as the baseline for tracking price changes via the UK House Price Index."
      />

      <Form.TextField
        id="postcode"
        title="Postcode"
        placeholder="e.g. SW1A 1AA"
        error={postcodeError}
        onChange={() => postcodeError && setPostcodeError(undefined)}
        info="UK postcode of the property. Used to determine the region for House Price Index tracking. Currently supports England and Wales."
      />

      {/* ── Mortgage Details (optional, Mortgage type only) ── */}
      {isMortgage && (
        <>
          <Form.Separator />

          <Form.Description
            title="📊 Mortgage Details"
            text={`Optional: provide your mortgage rate, term, and start date to track how your monthly payments split between principal (building equity) and interest. If provided, equity growth from principal repayment is factored into your property's value.`}
          />

          <Form.TextField
            id="mortgageRate"
            title="Interest Rate (%)"
            placeholder="e.g. 4.5"
            error={rateError}
            onChange={() => rateError && setRateError(undefined)}
            info="Your annual mortgage interest rate as a percentage."
          />

          <Form.TextField
            id="mortgageTerm"
            title="Mortgage Term (years)"
            placeholder="e.g. 25"
            error={termError}
            onChange={() => termError && setTermError(undefined)}
            info="The total mortgage term in years (e.g. 25 for a 25-year mortgage)."
          />

          <Form.DatePicker
            id="mortgageStartDate"
            title="Mortgage Start Date"
            info="The date your mortgage began. Used together with the rate and term to calculate how much principal you've repaid."
          />
        </>
      )}

      {/* Hidden fields for non-mortgage type to ensure form values object has all keys */}
      {!isMortgage && (
        <>
          <Form.TextField id="mortgageRate" title="" value="" />
          <Form.TextField id="mortgageTerm" title="" value="" />
        </>
      )}

      {/* ── Shared Ownership (optional, any property type) ── */}
      <Form.Separator />

      <Form.Description
        title="👥 Shared Ownership"
        text="Optional: if the property is jointly owned, specify your ownership share and your personal share of the deposit. The ownership ratio applies only to gains/losses — your deposit share stays yours."
      />

      <Form.TextField
        id="sharedOwnership"
        title="Ownership Share (%)"
        placeholder="e.g. 50"
        error={sharedOwnershipError}
        onChange={() => sharedOwnershipError && setSharedOwnershipError(undefined)}
        info="Your ownership percentage of the property (e.g. 50 for a 50/50 split). Leave empty for sole ownership (100%)."
      />

      <Form.TextField
        id="myEquityShare"
        title={`My Share of Deposit (${currencySymbol})`}
        placeholder="e.g. 40000"
        error={myEquityShareError}
        onChange={() => myEquityShareError && setMyEquityShareError(undefined)}
        info="Your personal share of the deposit/equity. The shared ownership ratio is applied only to the net change (principal repaid + market movement) — not to this amount. Final equity = your share + (net change × ownership %)."
      />
    </Form>
  );
}
