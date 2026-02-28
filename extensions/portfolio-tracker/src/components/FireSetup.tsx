/**
 * FireSetup component — FIRE settings form.
 *
 * Presented on first launch (onboarding) or when the user edits settings
 * from the FIRE dashboard. Collects all configuration needed to run
 * FIRE projections.
 *
 * Features:
 * - Target Value field with optional "Calculate from Spending" helper:
 *   leave Target blank, fill Monthly Spending → target is auto-calculated
 *   on submit using: monthlySpending × 12 × (100 / withdrawalRate)
 * - Withdrawal rate, inflation, growth rate with sensible defaults
 * - Year of birth for age-at-retirement calculations
 * - Holiday entitlement for working-days-to-FIRE metric
 * - SIPP access age (UK pension unlock age)
 * - Account exclusion via TagPicker — all accounts included by default,
 *   deselect to exclude from the FIRE portfolio value
 *
 * Usage (initial setup — rendered inline by fire.tsx):
 * ```tsx
 * <FireSetup
 *   accounts={portfolio.accounts}
 *   currentPortfolioValue={420000}
 *   baseCurrency="GBP"
 *   onSave={async (settings) => { await save(settings); }}
 * />
 * ```
 *
 * Usage (edit mode — pushed from FireDashboard):
 * ```tsx
 * push(
 *   <FireSetup
 *     settings={existingSettings}
 *     accounts={portfolio.accounts}
 *     currentPortfolioValue={420000}
 *     baseCurrency="GBP"
 *     onSave={async (settings) => { await save(settings); pop(); }}
 *   />
 * );
 * ```
 */

import React from "react";
import { useState } from "react";
import { Form, ActionPanel, Action, Icon } from "@raycast/api";
import { Account } from "../utils/types";
import { FireSettings, FIRE_DEFAULTS } from "../utils/fire-types";
import { isPropertyAccountType } from "../utils/types";
import { calculateFireNumber } from "../services/fire-calculator";
import { ACCOUNT_TYPE_LABELS } from "../utils/constants";

// ──────────────────────────────────────────
// Props
// ──────────────────────────────────────────

export interface FireSetupProps {
  /**
   * Existing FIRE settings to pre-populate the form (edit mode).
   * When undefined, the form shows defaults (onboarding mode).
   */
  settings?: FireSettings | null;

  /** All accounts in the portfolio (for the exclusion picker) */
  accounts: Account[];

  /** Current total portfolio value in base currency (for display context) */
  currentPortfolioValue: number;

  /** User's base currency code (e.g. "GBP") */
  baseCurrency: string;

  /**
   * Callback fired when the user submits valid settings.
   * The parent is responsible for persisting and navigating.
   */
  onSave: (settings: FireSettings) => Promise<void>;
}

// ──────────────────────────────────────────
// Currency Symbols (local, no Raycast Color import)
// ──────────────────────────────────────────

const CURRENCY_SYMBOLS: Record<string, string> = {
  GBP: "£",
  USD: "$",
  EUR: "€",
  CHF: "Fr",
  JPY: "¥",
  CAD: "C$",
  AUD: "A$",
};

// ──────────────────────────────────────────
// Component
// ──────────────────────────────────────────

export function FireSetup({
  settings,
  accounts,
  currentPortfolioValue,
  baseCurrency,
  onSave,
}: FireSetupProps): React.JSX.Element {
  const isEditing = !!settings;
  const currencySymbol = CURRENCY_SYMBOLS[baseCurrency] ?? baseCurrency;

  // ── Form-level state ──

  const [isSubmitting, setIsSubmitting] = useState(false);

  // ── Error state for fields with custom validation ──

  const [targetError, setTargetError] = useState<string | undefined>();
  const [spendingError, setSpendingError] = useState<string | undefined>();
  const [withdrawalError, setWithdrawalError] = useState<string | undefined>();
  const [inflationError, setInflationError] = useState<string | undefined>();
  const [growthError, setGrowthError] = useState<string | undefined>();
  const [birthYearError, setBirthYearError] = useState<string | undefined>();
  const [holidayError, setHolidayError] = useState<string | undefined>();
  const [sippError, setSippError] = useState<string | undefined>();
  const [targetAgeError, setTargetAgeError] = useState<string | undefined>();
  const [targetYearError, setTargetYearError] = useState<string | undefined>();

  // ── Default values for form fields ──

  const defaults = {
    targetValue: settings?.targetValue?.toString() ?? "",
    monthlySpending: "",
    withdrawalRate: (settings?.withdrawalRate ?? FIRE_DEFAULTS.withdrawalRate).toString(),
    annualInflation: (settings?.annualInflation ?? FIRE_DEFAULTS.annualInflation).toString(),
    annualGrowthRate: (settings?.annualGrowthRate ?? FIRE_DEFAULTS.annualGrowthRate).toString(),
    yearOfBirth: settings?.yearOfBirth?.toString() ?? "",
    holidayEntitlement: (settings?.holidayEntitlement ?? FIRE_DEFAULTS.holidayEntitlement).toString(),
    sippAccessAge: (settings?.sippAccessAge ?? FIRE_DEFAULTS.sippAccessAge).toString(),
    targetFireAge: settings?.targetFireAge?.toString() ?? "",
    targetFireYear: settings?.targetFireYear?.toString() ?? "",
    includedAccountIds: accounts
      .filter((a) => {
        // If editing existing settings, respect the saved exclusion list
        if (settings) {
          return !settings.excludedAccountIds.includes(a.id);
        }
        // On first setup (no settings), exclude Property accounts by default.
        // Primary residence is not typically counted toward FIRE net worth.
        return !isPropertyAccountType(a.type);
      })
      .map((a) => a.id),
  };

  // ── Validation Helpers ──

  function validatePositiveNumber(value: string, fieldName: string): string | undefined {
    const trimmed = value.trim();
    if (trimmed.length === 0) return `${fieldName} is required`;
    const num = Number(trimmed);
    if (isNaN(num) || !isFinite(num)) return "Must be a valid number";
    if (num <= 0) return `${fieldName} must be greater than zero`;
    return undefined;
  }

  function validatePercentage(value: string, fieldName: string): string | undefined {
    const trimmed = value.trim();
    if (trimmed.length === 0) return `${fieldName} is required`;
    const num = Number(trimmed);
    if (isNaN(num) || !isFinite(num)) return "Must be a valid number";
    if (num < 0) return `${fieldName} cannot be negative`;
    if (num > 100) return `${fieldName} cannot exceed 100%`;
    return undefined;
  }

  function validateYear(value: string): string | undefined {
    const trimmed = value.trim();
    if (trimmed.length === 0) return "Year of birth is required";
    const num = Number(trimmed);
    if (isNaN(num) || !isFinite(num) || !Number.isInteger(num)) return "Must be a valid year";
    const currentYear = new Date().getFullYear();
    if (num < 1900 || num > currentYear) return `Must be between 1900 and ${currentYear}`;
    return undefined;
  }

  function validateInteger(value: string, fieldName: string, min: number, max: number): string | undefined {
    const trimmed = value.trim();
    if (trimmed.length === 0) return `${fieldName} is required`;
    const num = Number(trimmed);
    if (isNaN(num) || !isFinite(num) || !Number.isInteger(num)) return "Must be a whole number";
    if (num < min || num > max) return `Must be between ${min} and ${max}`;
    return undefined;
  }

  // ── Submit Handler ──

  async function handleSubmit(values: {
    targetValue: string;
    monthlySpending: string;
    withdrawalRate: string;
    annualInflation: string;
    annualGrowthRate: string;
    yearOfBirth: string;
    holidayEntitlement: string;
    sippAccessAge: string;
    targetFireAge: string;
    targetFireYear: string;
    includedAccountIds: string[];
  }) {
    // ── Parse withdrawal rate first (needed for FIRE number calc) ──

    const wrError = validatePercentage(values.withdrawalRate, "Withdrawal rate");
    if (wrError) {
      setWithdrawalError(wrError);
      return;
    }
    const withdrawalRate = Number(values.withdrawalRate.trim());

    // ── Resolve target value ──

    let targetValue: number;

    const hasTarget = values.targetValue.trim().length > 0;
    const hasSpending = values.monthlySpending.trim().length > 0;

    if (hasTarget) {
      const tvError = validatePositiveNumber(values.targetValue, "Target value");
      if (tvError) {
        setTargetError(tvError);
        return;
      }
      targetValue = Number(values.targetValue.trim());
    } else if (hasSpending) {
      const spError = validatePositiveNumber(values.monthlySpending, "Monthly spending");
      if (spError) {
        setSpendingError(spError);
        return;
      }
      const monthlySpending = Number(values.monthlySpending.trim());
      targetValue = calculateFireNumber(monthlySpending, withdrawalRate);
    } else {
      setTargetError("Enter a target value or monthly spending to calculate one");
      return;
    }

    // ── Validate remaining fields ──

    const infError = validatePercentage(values.annualInflation, "Inflation rate");
    if (infError) {
      setInflationError(infError);
      return;
    }

    const grError = validatePercentage(values.annualGrowthRate, "Growth rate");
    if (grError) {
      setGrowthError(grError);
      return;
    }

    const byError = validateYear(values.yearOfBirth);
    if (byError) {
      setBirthYearError(byError);
      return;
    }

    const holError = validateInteger(values.holidayEntitlement, "Holiday entitlement", 0, 365);
    if (holError) {
      setHolidayError(holError);
      return;
    }

    const sippErr = validateInteger(values.sippAccessAge, "SIPP access age", 40, 100);
    if (sippErr) {
      setSippError(sippErr);
      return;
    }

    const hasTargetAge = values.targetFireAge.trim().length > 0;
    const hasTargetYear = values.targetFireYear.trim().length > 0;

    let targetFireAge: number | null = null;
    let targetFireYear: number | null = null;

    if (hasTargetAge && hasTargetYear) {
      const msg = "Choose either Target FIRE age or Target FIRE year";
      setTargetAgeError(msg);
      setTargetYearError(msg);
      return;
    }

    if (hasTargetAge) {
      const ageErr = validateInteger(values.targetFireAge, "Target FIRE age", 30, 100);
      if (ageErr) {
        setTargetAgeError(ageErr);
        return;
      }
      targetFireAge = Number(values.targetFireAge.trim());
    }

    if (hasTargetYear) {
      const currentYear = new Date().getFullYear();
      const yearErr = validateInteger(values.targetFireYear, "Target FIRE year", currentYear, currentYear + 100);
      if (yearErr) {
        setTargetYearError(yearErr);
        return;
      }
      targetFireYear = Number(values.targetFireYear.trim());
    }

    // ── Build settings object ──

    const allAccountIds = accounts.map((a) => a.id);
    const excludedAccountIds = allAccountIds.filter((id) => !values.includedAccountIds.includes(id));

    const newSettings: FireSettings = {
      targetValue,
      withdrawalRate,
      annualInflation: Number(values.annualInflation.trim()),
      annualGrowthRate: Number(values.annualGrowthRate.trim()),
      yearOfBirth: Number(values.yearOfBirth.trim()),
      holidayEntitlement: Number(values.holidayEntitlement.trim()),
      sippAccessAge: Number(values.sippAccessAge.trim()),
      targetFireAge,
      targetFireYear,
      excludedAccountIds,
      contributions: settings?.contributions ?? [],
      updatedAt: new Date().toISOString(),
    };

    // ── Save ──

    setIsSubmitting(true);
    try {
      await onSave(newSettings);
    } catch (error) {
      console.error("FireSetup save failed:", error);
    } finally {
      setIsSubmitting(false);
    }
  }

  // ── Computed display values ──

  const portfolioDisplay =
    currentPortfolioValue > 0
      ? `${currencySymbol}${currentPortfolioValue.toLocaleString("en", { maximumFractionDigits: 0 })}`
      : "No positions yet";

  // ── Render ──

  return (
    <Form
      navigationTitle={isEditing ? "Edit FIRE Settings" : "FIRE Setup"}
      isLoading={isSubmitting}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={isEditing ? "Save Changes" : "Configure Contributions"}
            icon={Icon.Checkmark}
            onSubmit={handleSubmit}
          />
        </ActionPanel>
      }
    >
      {/* ── Welcome / Context ── */}
      {!isEditing && (
        <Form.Description
          title="🔥 Welcome to FIRE"
          text="Configure your Financial Independence target. Your current portfolio will be used as the starting point for projections."
        />
      )}

      <Form.Description title="Current Portfolio" text={portfolioDisplay} />

      <Form.Separator />

      {/* ── Target Timeline ── */}
      <Form.Description
        title="Target Timeline"
        text="Optionally set a target FIRE age or target FIRE year to gauge if you're on track. Leave blank to use the default projection window."
      />

      <Form.TextField
        id="targetFireAge"
        title="Target FIRE Age"
        placeholder="e.g. 50"
        defaultValue={defaults.targetFireAge}
        error={targetAgeError}
        onChange={() => {
          if (targetAgeError) {
            setTargetAgeError(undefined);
          }
          if (targetYearError) {
            setTargetYearError(undefined);
          }
        }}
        info="Choose either a target age or a target year — not both."
      />

      <Form.TextField
        id="targetFireYear"
        title="Target FIRE Year"
        placeholder="e.g. 2045"
        defaultValue={defaults.targetFireYear}
        error={targetYearError}
        onChange={() => {
          if (targetYearError) {
            setTargetYearError(undefined);
          }
          if (targetAgeError) {
            setTargetAgeError(undefined);
          }
        }}
        info="Choose either a target year or a target age — not both."
      />

      <Form.Separator />

      {/* ── Target Section ── */}
      <Form.Description
        title="FIRE Target"
        text={`Enter your target directly, or fill in Monthly Spending to auto-calculate.\nFormula: Monthly Spending × 12 × (100 ÷ Withdrawal Rate)`}
      />

      <Form.TextField
        id="targetValue"
        title={`Target Value (${currencySymbol})`}
        placeholder="e.g. 1000000"
        defaultValue={defaults.targetValue}
        error={targetError}
        onChange={() => targetError && setTargetError(undefined)}
        info="The portfolio value at which you achieve financial independence. Leave blank to calculate from monthly spending below."
      />

      <Form.TextField
        id="monthlySpending"
        title={`Monthly Spending (${currencySymbol})`}
        placeholder="e.g. 3000"
        defaultValue={defaults.monthlySpending}
        error={spendingError}
        onChange={() => spendingError && setSpendingError(undefined)}
        info="Optional. If Target Value is blank, your FIRE number will be calculated as: spending × 12 × (100 ÷ withdrawal rate). At 4%, this equals annual spending × 25."
      />

      <Form.TextField
        id="withdrawalRate"
        title="Withdrawal Rate (%)"
        placeholder="e.g. 4"
        defaultValue={defaults.withdrawalRate}
        error={withdrawalError}
        onChange={() => withdrawalError && setWithdrawalError(undefined)}
        info="The percentage of your portfolio you plan to withdraw annually in retirement. The '4% rule' is a widely used default based on the Trinity Study."
      />

      <Form.Separator />

      {/* ── Assumptions Section ── */}

      <Form.TextField
        id="annualInflation"
        title="Annual Inflation (%)"
        placeholder="e.g. 2.5"
        defaultValue={defaults.annualInflation}
        error={inflationError}
        onChange={() => inflationError && setInflationError(undefined)}
        info="Assumed long-term annual inflation rate. Subtracted from growth rate to calculate real (purchasing-power-adjusted) returns."
      />

      <Form.TextField
        id="annualGrowthRate"
        title="Annual Growth Rate (%)"
        placeholder="e.g. 7"
        defaultValue={defaults.annualGrowthRate}
        error={growthError}
        onChange={() => growthError && setGrowthError(undefined)}
        info="Assumed average nominal annual return on your portfolio. 7% is a common long-term average for diversified equity portfolios."
      />

      <Form.Separator />

      {/* ── Personal Section ── */}

      <Form.TextField
        id="yearOfBirth"
        title="Year of Birth"
        placeholder="e.g. 1990"
        defaultValue={defaults.yearOfBirth}
        error={birthYearError}
        onChange={() => birthYearError && setBirthYearError(undefined)}
        info="Used to calculate your age at retirement and when SIPP/pension becomes accessible."
      />

      <Form.TextField
        id="holidayEntitlement"
        title="Holiday Entitlement (days/year)"
        placeholder="e.g. 25"
        defaultValue={defaults.holidayEntitlement}
        error={holidayError}
        onChange={() => holidayError && setHolidayError(undefined)}
        info="Annual holiday allowance. Used to calculate working days remaining until FIRE."
      />

      <Form.TextField
        id="sippAccessAge"
        title="Pension Access Age"
        placeholder="e.g. 57"
        defaultValue={defaults.sippAccessAge}
        error={sippError}
        onChange={() => sippError && setSippError(undefined)}
        info="Age at which SIPP/pension funds become accessible. Currently 57 in the UK (rising to 58 in 2028)."
      />

      <Form.Separator />

      {/* ── Account Inclusion ── */}

      {accounts.length > 0 && (
        <Form.TagPicker
          id="includedAccountIds"
          title="Include Accounts"
          defaultValue={defaults.includedAccountIds}
          info="Select which accounts count towards your FIRE portfolio value. Deselect accounts you want to exclude (e.g. trading/fun accounts)."
        >
          {accounts.map((account) => {
            const typeLabel = ACCOUNT_TYPE_LABELS[account.type] ?? account.type;
            return <Form.TagPicker.Item key={account.id} value={account.id} title={`${account.name} (${typeLabel})`} />;
          })}
        </Form.TagPicker>
      )}

      {accounts.length === 0 && (
        <Form.Description
          title="⚠️ No Accounts"
          text="Create accounts in the Portfolio Tracker first, then come back to configure FIRE."
        />
      )}
    </Form>
  );
}
