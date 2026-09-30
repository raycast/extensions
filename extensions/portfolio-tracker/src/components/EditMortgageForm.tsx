/**
 * EditMortgageForm component.
 *
 * A Raycast Form view for editing an existing property position (MORTGAGE
 * or OWNED_PROPERTY). Pre-populates all fields from the current position
 * data and allows the user to update any value.
 *
 * Editable fields:
 * - Property Name (display name / custom name)
 * - Property Type (Mortgage ↔ Owned Outright — changing type adjusts visible fields)
 * - Total Property Value
 * - Current Equity (Mortgage only)
 * - Valuation Date
 * - Postcode
 * - Mortgage Interest Rate % (optional, Mortgage only)
 * - Mortgage Term in years (optional, Mortgage only)
 * - Mortgage Start Date (optional, Mortgage only)
 *
 * On submission, calls `onSave` with the updated position data, then pops navigation.
 *
 * Design:
 * - Follows the same single-frame rendering pattern as other edit forms
 * - Reuses validation logic consistent with AddMortgageForm
 * - Pre-populates from the existing position's `mortgageData` and `customName`/`name`
 *
 * Usage:
 * ```tsx
 * <EditMortgageForm
 *   position={position}
 *   accountId={account.id}
 *   accountName={account.name}
 *   baseCurrency="GBP"
 *   onSave={async (updates) => {
 *     await updatePosition(account.id, position.id, updates);
 *   }}
 *   onDone={() => { pop(); revalidatePortfolio(); }}
 * />
 * ```
 */

import React from "react";
import { Form, ActionPanel, Action, Icon, showToast, Toast } from "@raycast/api";
import { useState } from "react";
import { Position, AssetType, MortgageData } from "../utils/types";
import { validatePostcodeFormat } from "../services/property-price";
import { getCurrencySymbol, getDisplayName } from "../utils/formatting";

// ──────────────────────────────────────────
// Props
// ──────────────────────────────────────────

interface EditMortgageFormProps {
  /** The existing property position to edit */
  position: Position;

  /** The ID of the account containing this position */
  accountId: string;

  /** The name of the parent account (for display context) */
  accountName: string;

  /** The user's base currency code (e.g. "GBP") */
  baseCurrency: string;

  /**
   * Callback fired when the form is submitted with valid data.
   * Receives all updated position fields. The parent is responsible
   * for persisting the changes via usePortfolio mutations.
   */
  onSave: (updates: {
    name: string;
    customName?: string;
    assetType: AssetType;
    mortgageData: MortgageData;
  }) => Promise<void>;

  /**
   * Callback fired after a successful save.
   * Typically pops the navigation stack and revalidates data.
   */
  onDone: () => void;
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
 * Form for editing an existing property position.
 *
 * All fields are pre-populated from the current position data.
 * The form adapts dynamically when the property type changes
 * (e.g. switching from Mortgage to Owned Outright hides mortgage fields).
 */
export function EditMortgageForm({
  position,
  accountId,
  accountName,
  baseCurrency,
  onSave,
  onDone,
}: EditMortgageFormProps): React.JSX.Element {
  // Suppress unused variable lint — accountId is part of the prop contract
  void accountId;

  const currencySymbol = getCurrencySymbol(baseCurrency);
  const displayName = getDisplayName(position);
  const mortgageData = position.mortgageData;

  // ── Form State ──

  const [propertyType, setPropertyType] = useState<string>(position.assetType);
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

  // ── Default Values (from existing position) ──

  const defaults = {
    propertyName: displayName,
    propertyType: position.assetType,
    totalValue: mortgageData?.totalPropertyValue?.toString() ?? "",
    equity: mortgageData?.equity?.toString() ?? "",
    valuationDate: mortgageData?.valuationDate ? new Date(mortgageData.valuationDate) : null,
    postcode: mortgageData?.postcode ?? "",
    mortgageRate: mortgageData?.mortgageRate?.toString() ?? "",
    mortgageTerm: mortgageData?.mortgageTerm?.toString() ?? "",
    mortgageStartDate: mortgageData?.mortgageStartDate ? new Date(mortgageData.mortgageStartDate) : null,
    sharedOwnership: mortgageData?.sharedOwnershipPercent?.toString() ?? "",
    myEquityShare: mortgageData?.myEquityShare?.toString() ?? "",
  };

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
      const rateErrMsg = validatePercentage(values.mortgageRate, "Interest rate");
      if (rateErrMsg) {
        setRateError(rateErrMsg);
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

    // ── Build updated mortgage data ──

    const updatedMortgageData: MortgageData = {
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
      const newName = values.propertyName.trim();

      // Determine if the user changed the name
      // If the original name matches, keep it as the base name.
      // If different, set it as a customName (preserving original for reference).
      const customName = newName !== position.name ? newName : undefined;

      await onSave({
        name: position.name, // preserve original name
        customName,
        assetType: selectedType,
        mortgageData: updatedMortgageData,
      });

      await showToast({
        style: Toast.Style.Success,
        title: "Property Updated",
        message: newName,
      });

      onDone();
    } catch (error) {
      console.error("EditMortgageForm save failed:", error);
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to Update Property",
        message: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  // ── Render ──

  return (
    <Form
      navigationTitle={`Edit Property — ${displayName}`}
      isLoading={isSubmitting}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Changes" icon={Icon.Check} onSubmit={handleSubmit} />
          <Action
            title="Cancel"
            icon={Icon.XMarkCircle}
            onAction={onDone}
            shortcut={{ modifiers: ["cmd"], key: "." }}
          />
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
        defaultValue={defaults.propertyName}
        error={nameError}
        onChange={() => nameError && setNameError(undefined)}
        autoFocus
      />

      {/* ── Property Type ── */}
      <Form.Dropdown
        id="propertyType"
        title="Property Type"
        defaultValue={defaults.propertyType}
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
        defaultValue={defaults.totalValue}
        error={valueError}
        onChange={() => valueError && setValueError(undefined)}
        info="The full market value of the property at the time of valuation."
      />

      {isMortgage && (
        <Form.TextField
          id="equity"
          title={`Current Equity (${currencySymbol})`}
          placeholder="e.g. 100000"
          defaultValue={defaults.equity}
          error={equityError}
          onChange={() => equityError && setEquityError(undefined)}
          info="Your ownership stake in the property — typically your deposit plus any principal repaid."
        />
      )}

      {/* Hidden equity field for owned outright — ensures form values always include equity */}
      {!isMortgage && <Form.TextField id="equity" title="" value="0" />}

      <Form.DatePicker
        id="valuationDate"
        title="Valuation Date"
        defaultValue={defaults.valuationDate ?? undefined}
        info="The date when the property was last valued. Used as the baseline for tracking price changes via the UK House Price Index."
      />

      <Form.TextField
        id="postcode"
        title="Postcode"
        placeholder="e.g. SW1A 1AA"
        defaultValue={defaults.postcode}
        error={postcodeError}
        onChange={() => postcodeError && setPostcodeError(undefined)}
        info="UK postcode of the property. Used to determine the region for House Price Index tracking."
      />

      {/* ── Mortgage Details (optional, Mortgage type only) ── */}
      {isMortgage && (
        <>
          <Form.Separator />

          <Form.Description
            title="📊 Mortgage Details"
            text="Optional: provide your mortgage rate, term, and start date to track principal repayment. All three fields must be provided together, or left empty."
          />

          <Form.TextField
            id="mortgageRate"
            title="Interest Rate (%)"
            placeholder="e.g. 4.5"
            defaultValue={defaults.mortgageRate}
            error={rateError}
            onChange={() => rateError && setRateError(undefined)}
            info="Your annual mortgage interest rate as a percentage."
          />

          <Form.TextField
            id="mortgageTerm"
            title="Mortgage Term (years)"
            placeholder="e.g. 25"
            defaultValue={defaults.mortgageTerm}
            error={termError}
            onChange={() => termError && setTermError(undefined)}
            info="The total mortgage term in years."
          />

          <Form.DatePicker
            id="mortgageStartDate"
            title="Mortgage Start Date"
            defaultValue={defaults.mortgageStartDate ?? undefined}
            info="The date your mortgage began."
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
        defaultValue={defaults.sharedOwnership}
        error={sharedOwnershipError}
        onChange={() => sharedOwnershipError && setSharedOwnershipError(undefined)}
        info="Your ownership percentage of the property (e.g. 50 for a 50/50 split). Leave empty for sole ownership (100%)."
      />

      <Form.TextField
        id="myEquityShare"
        title={`My Share of Deposit (${currencySymbol})`}
        placeholder="e.g. 40000"
        defaultValue={defaults.myEquityShare}
        error={myEquityShareError}
        onChange={() => myEquityShareError && setMyEquityShareError(undefined)}
        info="Your personal share of the deposit/equity. The shared ownership ratio is applied only to the net change (principal repaid + market movement) — not to this amount. Final equity = your share + (net change × ownership %)."
      />
    </Form>
  );
}
