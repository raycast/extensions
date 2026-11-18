/**
 * EditDebtForm component.
 *
 * A Raycast Form view for editing an existing debt position.
 * Pre-populates all fields from the current position's DebtData and
 * allows the user to update balance, APR, repayment amount, etc.
 *
 * Additional features beyond AddDebtForm:
 * - Pre-populated fields from existing DebtData
 * - "Mark as Paid Off" toggle — sets the `paidOff` flag
 * - Loan progress display (for loan types with start/end dates)
 *
 * The form adapts based on the debt type, identical to AddDebtForm:
 * - Loan types show start/end date fields
 * - BNPL defaults APR to 0
 *
 * On submission, calls `onSave` with the updated fields, then calls `onDone`.
 *
 * Usage:
 * ```tsx
 * <EditDebtForm
 *   position={position}
 *   accountId={account.id}
 *   accountName={account.name}
 *   baseCurrency="GBP"
 *   onSave={async (updates) => {
 *     await updateDebtPosition(accountId, position.id, updates);
 *   }}
 *   onDone={() => {
 *     pop();
 *     revalidatePortfolio();
 *   }}
 * />
 * ```
 */

import React from "react";
import { Form, ActionPanel, Action, Icon, showToast, Toast } from "@raycast/api";
import { useState, useEffect } from "react";
import { Position, AssetType, DebtData, isAmortisedDebtType } from "../utils/types";
import { getCurrencySymbol, getDisplayName } from "../utils/formatting";
import { calculateAmortisedPayment, monthsBetweenDates, calculateLoanProgress } from "../services/debt-calculator";

// ──────────────────────────────────────────
// Props
// ──────────────────────────────────────────

interface EditDebtFormProps {
  /** The existing debt position to edit */
  position: Position;

  /** The ID of the account containing this position */
  accountId: string;

  /** The name of the parent account (for display context) */
  accountName: string;

  /** The user's base currency code (e.g. "GBP") */
  baseCurrency: string;

  /**
   * The live synced balance from the repayment engine (currentPrice from PositionValuation).
   * When provided, pre-populates the balance field with the actual post-repayment balance
   * rather than the stale original value stored in debtData.currentBalance.
   * Falls back to debtData.currentBalance if not provided.
   */
  syncedBalance?: number;

  /**
   * Callback fired when the form is submitted with valid data.
   * Receives the updated fields for the position.
   */
  onSave: (updates: {
    name?: string;
    customName?: string;
    assetType?: AssetType;
    debtData?: DebtData;
  }) => Promise<void>;

  /**
   * Callback fired after successful save.
   * Typically pops the navigation and revalidates.
   */
  onDone: () => void;
}

// ──────────────────────────────────────────
// Debt Type Options
// ──────────────────────────────────────────

const DEBT_TYPE_OPTIONS = [
  { value: AssetType.CREDIT_CARD, title: "💳 Credit Card" },
  { value: AssetType.LOAN, title: "🏦 Loan" },
  { value: AssetType.STUDENT_LOAN, title: "📚💰 Student Loan" },
  { value: AssetType.AUTO_LOAN, title: "🚗 Auto Loan" },
  { value: AssetType.BNPL, title: "💳 Buy Now Pay Later" },
];

// ──────────────────────────────────────────
// Currency Options
// ──────────────────────────────────────────

const CURRENCY_OPTIONS = [
  { value: "GBP", title: "GBP (£)" },
  { value: "USD", title: "USD ($)" },
  { value: "EUR", title: "EUR (€)" },
  { value: "CHF", title: "CHF (Fr)" },
  { value: "JPY", title: "JPY (¥)" },
  { value: "CAD", title: "CAD (C$)" },
  { value: "AUD", title: "AUD (A$)" },
  { value: "SEK", title: "SEK (kr)" },
  { value: "NOK", title: "NOK (kr)" },
  { value: "DKK", title: "DKK (kr)" },
  { value: "HKD", title: "HKD (HK$)" },
  { value: "SGD", title: "SGD (S$)" },
  { value: "CNY", title: "CNY (¥)" },
  { value: "INR", title: "INR (₹)" },
  { value: "BRL", title: "BRL (R$)" },
  { value: "ZAR", title: "ZAR (R)" },
];

// ──────────────────────────────────────────
// Component
// ──────────────────────────────────────────

/**
 * Form for editing an existing debt position.
 *
 * Renders a Raycast Form with fields pre-populated from the position's
 * DebtData. Adapts fields based on debt type (loan types show date fields).
 *
 * On successful submission, calls `onSave` then `onDone`.
 */
export function EditDebtForm({
  position,
  accountId,
  accountName,
  baseCurrency,
  syncedBalance,
  onSave,
  onDone,
}: EditDebtFormProps): React.JSX.Element {
  void accountId;

  const debtData = position.debtData!;
  const displayName = getDisplayName(position);
  const currencySymbol = getCurrencySymbol(position.currency || baseCurrency);

  // ── Form State ──

  const [debtType, setDebtType] = useState<string>(position.assetType);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Track raw string values for controlled inputs
  const [nameStr, setNameStr] = useState(position.customName || position.name);
  // Use the live synced balance if available — it reflects auto-applied repayments.
  // Falls back to the original stored value when no sync result exists yet.
  const initialBalance = syncedBalance ?? debtData.currentBalance;
  const [balanceStr, setBalanceStr] = useState(String(initialBalance));
  const [aprStr, setAprStr] = useState(String(debtData.apr));
  const [repaymentStr, setRepaymentStr] = useState(String(debtData.monthlyRepayment));
  const [repaymentDayStr, setRepaymentDayStr] = useState(String(debtData.repaymentDayOfMonth));
  const [paidOff, setPaidOff] = useState(debtData.paidOff ?? false);
  const [loanStartDate, setLoanStartDate] = useState<Date | null>(
    debtData.loanStartDate ? new Date(debtData.loanStartDate) : null,
  );
  const [loanEndDate, setLoanEndDate] = useState<Date | null>(
    debtData.loanEndDate ? new Date(debtData.loanEndDate) : null,
  );

  // ── Error State ──

  const [nameError, setNameError] = useState<string | undefined>();
  const [balanceError, setBalanceError] = useState<string | undefined>();
  const [aprError, setAprError] = useState<string | undefined>();
  const [repaymentError, setRepaymentError] = useState<string | undefined>();
  const [repaymentDayError, setRepaymentDayError] = useState<string | undefined>();

  // ── Derived State ──

  // Student loans are open-ended (no fixed end date), so they don't show loan term fields.
  // LOAN and AUTO_LOAN are amortised with a known end date.
  const isLoanType = isAmortisedDebtType(debtType as AssetType) && debtType !== AssetType.STUDENT_LOAN;

  // ── Loan Progress Info (display only) ──

  let progressText = "";
  if (isLoanType && debtData.loanStartDate && debtData.loanEndDate) {
    const progress = calculateLoanProgress(debtData.loanStartDate, debtData.loanEndDate);
    progressText = `${progress.monthsElapsed} of ${progress.totalMonths} months elapsed (${progress.progressPercent.toFixed(1)}%)`;
    if (progress.isTermComplete) {
      progressText += " — Term complete";
    }
  }

  // ── Auto-calculate amortised payment when loan dates + balance + APR change ──

  useEffect(() => {
    if (!isLoanType || !loanStartDate || !loanEndDate) return;

    const balance = Number(balanceStr);
    const apr = Number(aprStr);
    if (isNaN(balance) || balance <= 0) return;
    if (isNaN(apr) || apr < 0) return;

    const totalMonths = monthsBetweenDates(loanStartDate, loanEndDate);
    if (totalMonths <= 0) return;

    const monthly = calculateAmortisedPayment(balance, apr, totalMonths);
    if (monthly > 0 && isFinite(monthly)) {
      setRepaymentStr(monthly.toFixed(2));
    }
  }, [isLoanType, loanStartDate, loanEndDate, balanceStr, aprStr]);

  // ── Validation Helpers ──

  function validateRequired(value: string | undefined, fieldName: string): string | undefined {
    const trimmed = (value ?? "").trim();
    if (trimmed.length === 0) return `${fieldName} is required`;
    return undefined;
  }

  function validatePositiveNumber(value: string | undefined, fieldName: string): string | undefined {
    const trimmed = (value ?? "").trim();
    if (trimmed.length === 0) return `${fieldName} is required`;
    const num = Number(trimmed);
    if (isNaN(num) || !isFinite(num)) return `${fieldName} must be a valid number`;
    if (num <= 0) return `${fieldName} must be greater than zero`;
    return undefined;
  }

  function validateNonNegativeNumber(value: string | undefined, fieldName: string): string | undefined {
    const trimmed = (value ?? "").trim();
    if (trimmed.length === 0) return `${fieldName} is required`;
    const num = Number(trimmed);
    if (isNaN(num) || !isFinite(num)) return `${fieldName} must be a valid number`;
    if (num < 0) return `${fieldName} cannot be negative`;
    return undefined;
  }

  function validateRepaymentDay(value: string | undefined): string | undefined {
    const trimmed = (value ?? "").trim();
    if (trimmed.length === 0) return "Repayment day is required";
    const num = Number(trimmed);
    if (isNaN(num) || !Number.isInteger(num)) return "Must be a whole number";
    if (num < 1 || num > 31) return "Must be between 1 and 31";
    return undefined;
  }

  // ── Submission ──

  async function handleSubmit() {
    // ── Validate required fields ──

    const nameErr = validateRequired(nameStr, "Debt name");
    if (nameErr) {
      setNameError(nameErr);
      return;
    }

    // If paid off, balance validation is relaxed (can be 0)
    if (!paidOff) {
      const balErr = validatePositiveNumber(balanceStr, "Outstanding balance");
      if (balErr) {
        setBalanceError(balErr);
        return;
      }
    } else {
      const balErr = validateNonNegativeNumber(balanceStr, "Outstanding balance");
      if (balErr) {
        setBalanceError(balErr);
        return;
      }
    }

    const aprErr = validateNonNegativeNumber(aprStr, "APR");
    if (aprErr) {
      setAprError(aprErr);
      return;
    }

    const repErr = validatePositiveNumber(repaymentStr, "Monthly repayment");
    if (repErr) {
      setRepaymentError(repErr);
      return;
    }

    const dayErr = validateRepaymentDay(repaymentDayStr);
    if (dayErr) {
      setRepaymentDayError(dayErr);
      return;
    }

    const balance = Number(balanceStr.trim());
    const apr = Number(aprStr.trim());
    const monthlyRepayment = Number(repaymentStr.trim());
    const repaymentDay = Number(repaymentDayStr.trim());
    const selectedType = debtType as AssetType;

    // ── Loan date validation ──

    let loanStartDateStr: string | undefined = debtData.loanStartDate;
    let loanEndDateStr: string | undefined = debtData.loanEndDate;
    let totalTermMonths: number | undefined = debtData.totalTermMonths;

    if (isLoanType && loanStartDate && loanEndDate) {
      if (loanEndDate <= loanStartDate) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Loan end date must be after start date",
        });
        return;
      }

      loanStartDateStr = loanStartDate.toISOString().split("T")[0];
      loanEndDateStr = loanEndDate.toISOString().split("T")[0];
      totalTermMonths = monthsBetweenDates(loanStartDate, loanEndDate);
    } else if (isLoanType && (loanStartDate || loanEndDate)) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Incomplete Loan Dates",
        message: "Please provide both start and end dates, or leave both empty.",
      });
      return;
    } else if (!isLoanType) {
      // Switching away from a loan type — clear loan fields
      loanStartDateStr = undefined;
      loanEndDateStr = undefined;
      totalTermMonths = undefined;
    }

    // ── Build updated debt data ──

    const updatedDebtData: DebtData = {
      currentBalance: balance,
      apr,
      repaymentDayOfMonth: repaymentDay,
      monthlyRepayment,
      enteredAt: debtData.enteredAt, // preserve original entry date
      ...(loanStartDateStr !== undefined && { loanStartDate: loanStartDateStr }),
      ...(loanEndDateStr !== undefined && { loanEndDate: loanEndDateStr }),
      ...(totalTermMonths !== undefined && { totalTermMonths }),
      paidOff: paidOff || undefined,
      // Preserve archived state
      ...(debtData.archived && { archived: debtData.archived }),
    };

    // ── Determine name changes ──

    const trimmedName = nameStr.trim();
    const newCustomName = trimmedName !== position.name ? trimmedName : undefined;

    // ── Submit ──

    setIsSubmitting(true);

    try {
      await onSave({
        name: position.name, // preserve original name
        customName: newCustomName,
        assetType: selectedType,
        debtData: updatedDebtData,
      });

      await showToast({
        style: Toast.Style.Success,
        title: "Debt Updated",
        message: `"${trimmedName}" has been updated.`,
      });

      onDone();
    } catch (error) {
      console.error("EditDebtForm submission failed:", error);
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to Update Debt",
        message: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  // ── Render ──

  return (
    <Form
      navigationTitle={`Edit Debt — ${displayName}`}
      isLoading={isSubmitting}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Changes" icon={Icon.Check} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      {/* ── Debt Name ── */}
      <Form.TextField
        id="debtName"
        title="Debt Name"
        placeholder="e.g. Barclaycard Visa, Car Finance"
        value={nameStr}
        error={nameError}
        onChange={(val) => {
          setNameStr(val);
          if (nameError) setNameError(undefined);
        }}
        autoFocus
      />

      {/* ── Debt Type ── */}
      <Form.Dropdown id="debtType" title="Debt Type" value={debtType} onChange={setDebtType}>
        {DEBT_TYPE_OPTIONS.map((option) => (
          <Form.Dropdown.Item key={option.value} value={option.value} title={option.title} />
        ))}
      </Form.Dropdown>

      {/* ── Paid Off Toggle ── */}
      <Form.Checkbox
        id="paidOff"
        title="Status"
        label="Mark as Paid Off ☑️"
        value={paidOff}
        onChange={setPaidOff}
        info="When checked, this debt is marked as fully repaid. It will appear greyed out in the portfolio."
      />

      {/* ── Paid Off Info (shown inline, right below status) ── */}
      {paidOff && (
        <Form.Description
          title=""
          text="🎉 This debt is marked as paid off! It will appear greyed out in the portfolio. You can archive it from the position actions."
        />
      )}

      <Form.Separator />

      {/* ── Outstanding Balance ── */}
      <Form.TextField
        id="balance"
        title={`Outstanding Balance (${currencySymbol})`}
        placeholder="e.g. 5000"
        value={balanceStr}
        error={balanceError}
        onChange={(val) => {
          setBalanceStr(val);
          if (balanceError) setBalanceError(undefined);
        }}
      />

      {/* ── APR ── */}
      <Form.TextField
        id="apr"
        title="APR (%)"
        placeholder="e.g. 19.9"
        value={aprStr}
        error={aprError}
        onChange={(val) => {
          setAprStr(val);
          if (aprError) setAprError(undefined);
        }}
        info="Annual Percentage Rate. Enter 0 for interest-free debt."
      />

      {/* ── Monthly Repayment ── */}
      <Form.TextField
        id="monthlyRepayment"
        title={`Monthly Repayment (${currencySymbol})`}
        placeholder="e.g. 200"
        value={repaymentStr}
        error={repaymentError}
        onChange={(val) => {
          setRepaymentStr(val);
          if (repaymentError) setRepaymentError(undefined);
        }}
        info={
          isLoanType
            ? "Set directly, or provide loan start/end dates below to auto-calculate via amortisation."
            : "Your fixed monthly repayment amount."
        }
      />

      {/* ── Repayment Day of Month ── */}
      <Form.TextField
        id="repaymentDay"
        title="Repayment Day of Month"
        placeholder="e.g. 15"
        value={repaymentDayStr}
        error={repaymentDayError}
        onChange={(val) => {
          setRepaymentDayStr(val);
          if (repaymentDayError) setRepaymentDayError(undefined);
        }}
        info="The day each month your repayment is due (1–31). Used to auto-track repayments."
      />

      {/* ── Currency ── */}
      <Form.Dropdown
        id="currency"
        title="Currency"
        defaultValue={position.currency || baseCurrency}
        info="Defaults to your base currency. Override if this debt is in a different currency."
      >
        {CURRENCY_OPTIONS.map((option) => (
          <Form.Dropdown.Item key={option.value} value={option.value} title={option.title} />
        ))}
      </Form.Dropdown>

      {/* ── Loan-specific fields ── */}
      {isLoanType && (
        <>
          <Form.Separator />
          <Form.Description
            title="📅 Loan Term"
            text={
              progressText
                ? `Progress: ${progressText}`
                : "Provide start and end dates to enable progress tracking and auto-calculate the amortised monthly repayment."
            }
          />

          <Form.DatePicker
            id="loanStartDate"
            title="Loan Start Date"
            type={Form.DatePicker.Type.Date}
            value={loanStartDate}
            onChange={setLoanStartDate}
          />

          <Form.DatePicker
            id="loanEndDate"
            title="Loan End Date"
            type={Form.DatePicker.Type.Date}
            value={loanEndDate}
            onChange={setLoanEndDate}
          />
        </>
      )}

      <Form.Separator />
      <Form.Description
        title=""
        text={`Editing "${displayName}" in ${accountName}. Balance auto-updates on repayment day ${debtData.repaymentDayOfMonth} each month.`}
      />
    </Form>
  );
}
