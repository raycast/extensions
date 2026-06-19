/**
 * AddDebtForm component.
 *
 * A Raycast Form view for adding a debt position to a Debt account.
 * Collects all data needed for debt tracking, interest calculation,
 * and repayment scheduling.
 *
 * The form adapts based on the selected debt type:
 *
 * **All types:**
 * - Debt Name (free text, e.g. "Barclaycard Visa")
 * - Debt Type (Credit Card / Loan / Student Loan / Auto Loan / BNPL)
 * - Outstanding Balance
 * - APR (Annual Percentage Rate)
 * - Monthly Repayment
 * - Repayment Day of Month (1–31)
 *
 * **Loan types (Loan / Student Loan / Auto Loan) — additional:**
 * - Loan Start Date (optional)
 * - Loan End Date (optional)
 * - When both dates are provided, monthly repayment is calculated via
 *   standard amortisation formula and the text field is auto-populated.
 *   Progress tracking (months elapsed / total) is also enabled.
 *
 * **BNPL — note:**
 * - APR defaults to 0% (interest-free instalments)
 *
 * On submission, creates a Position with the appropriate AssetType and
 * DebtData, then navigates back.
 *
 * Usage:
 * ```tsx
 * <AddDebtForm
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
import { useState, useEffect } from "react";
import { AssetType, DebtData } from "../utils/types";
import { getCurrencySymbol } from "../utils/formatting";
import { calculateAmortisedPayment, monthsBetweenDates } from "../services/debt-calculator";

// ──────────────────────────────────────────
// Props
// ──────────────────────────────────────────

interface AddDebtFormProps {
  /** The ID of the account to add the debt position to */
  accountId: string;

  /** The name of the target account (for display context) */
  accountName: string;

  /** The user's base currency code (e.g. "GBP") */
  baseCurrency: string;

  /**
   * Callback fired when the form is submitted with valid data.
   * Receives all data needed to create a new debt Position.
   */
  onConfirm: (params: {
    symbol: string;
    name: string;
    units: number;
    currency: string;
    assetType: AssetType;
    debtData: DebtData;
  }) => Promise<void>;
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
// Component
// ──────────────────────────────────────────

/**
 * Form for adding a debt position to an account.
 *
 * Renders a Raycast Form with adaptive fields based on the selected
 * debt type. Loan types show additional fields for term tracking
 * and amortisation-based repayment calculation.
 *
 * On successful submission, the form automatically navigates back (pops).
 */
export function AddDebtForm({ accountId, accountName, baseCurrency, onConfirm }: AddDebtFormProps): React.JSX.Element {
  // Suppress unused variable lint — accountId is part of the prop contract
  void accountId;

  const { pop } = useNavigation();
  const currencySymbol = getCurrencySymbol(baseCurrency);

  // ── Form State ──

  const [debtType, setDebtType] = useState<string>(AssetType.CREDIT_CARD);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Track raw string values for loan dates to compute amortised payment
  const [balanceStr, setBalanceStr] = useState("");
  const [aprStr, setAprStr] = useState("");
  const [repaymentStr, setRepaymentStr] = useState("");
  const [loanStartDate, setLoanStartDate] = useState<Date | null>(null);
  const [loanEndDate, setLoanEndDate] = useState<Date | null>(null);

  // ── Error State ──

  const [nameError, setNameError] = useState<string | undefined>();
  const [balanceError, setBalanceError] = useState<string | undefined>();
  const [aprError, setAprError] = useState<string | undefined>();
  const [repaymentError, setRepaymentError] = useState<string | undefined>();
  const [repaymentDayError, setRepaymentDayError] = useState<string | undefined>();

  // ── Derived State ──

  // Student loans are open-ended (no fixed end date), so they don't show loan term fields.
  // LOAN and AUTO_LOAN are amortised with a known end date.
  const isLoanType = debtType === AssetType.LOAN || debtType === AssetType.AUTO_LOAN;

  const isBNPL = debtType === AssetType.BNPL;

  // ── Auto-calculate amortised payment when loan dates + balance + APR are set ──

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

  async function handleSubmit(values: {
    debtName: string;
    debtType: string;
    balance: string;
    apr: string;
    monthlyRepayment: string;
    repaymentDay: string;
    currency: string;
    loanStartDate?: Date | null;
    loanEndDate?: Date | null;
  }) {
    // ── Validate required fields ──

    const nameErr = validateRequired(values.debtName, "Debt name");
    if (nameErr) {
      setNameError(nameErr);
      return;
    }

    const balErr = validatePositiveNumber(values.balance, "Outstanding balance");
    if (balErr) {
      setBalanceError(balErr);
      return;
    }

    const aprErr = validateNonNegativeNumber(values.apr, "APR");
    if (aprErr) {
      setAprError(aprErr);
      return;
    }

    const repErr = validatePositiveNumber(values.monthlyRepayment, "Monthly repayment");
    if (repErr) {
      setRepaymentError(repErr);
      return;
    }

    const dayErr = validateRepaymentDay(values.repaymentDay);
    if (dayErr) {
      setRepaymentDayError(dayErr);
      return;
    }

    const balance = Number(values.balance.trim());
    const apr = Number(values.apr.trim());
    const monthlyRepayment = Number(values.monthlyRepayment.trim());
    const repaymentDay = Number(values.repaymentDay.trim());
    const selectedType = values.debtType as AssetType;
    const currency = values.currency || baseCurrency;

    // ── Loan date validation ──

    let loanStartDateStr: string | undefined;
    let loanEndDateStr: string | undefined;
    let totalTermMonths: number | undefined;

    const formLoanStart = values.loanStartDate ?? loanStartDate;
    const formLoanEnd = values.loanEndDate ?? loanEndDate;

    if (isLoanType && formLoanStart && formLoanEnd) {
      if (formLoanEnd <= formLoanStart) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Loan end date must be after start date",
        });
        return;
      }

      loanStartDateStr = formLoanStart.toISOString().split("T")[0];
      loanEndDateStr = formLoanEnd.toISOString().split("T")[0];
      totalTermMonths = monthsBetweenDates(formLoanStart, formLoanEnd);
    } else if (isLoanType && (formLoanStart || formLoanEnd)) {
      // One date without the other
      await showToast({
        style: Toast.Style.Failure,
        title: "Incomplete Loan Dates",
        message: "Please provide both start and end dates, or leave both empty.",
      });
      return;
    }

    // ── Build debt data ──

    const debtData: DebtData = {
      currentBalance: balance,
      apr,
      repaymentDayOfMonth: repaymentDay,
      monthlyRepayment,
      enteredAt: new Date().toISOString(),
      ...(loanStartDateStr !== undefined && { loanStartDate: loanStartDateStr }),
      ...(loanEndDateStr !== undefined && { loanEndDate: loanEndDateStr }),
      ...(totalTermMonths !== undefined && { totalTermMonths }),
    };

    // ── Submit ──

    setIsSubmitting(true);

    try {
      // Use a synthetic symbol: DEBT:{type}:{sanitised_name}
      const sanitisedName = values.debtName
        .trim()
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, "_")
        .substring(0, 20);
      const symbol = `DEBT:${sanitisedName}`;
      const name = values.debtName.trim();

      await onConfirm({
        symbol,
        name,
        units: 1, // one debt = one unit
        currency,
        assetType: selectedType,
        debtData,
      });

      pop();
    } catch (error) {
      console.error("AddDebtForm submission failed:", error);
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to Add Debt",
        message: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  // ── Render ──

  return (
    <Form
      navigationTitle={`Add Debt — ${accountName}`}
      isLoading={isSubmitting}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Add Debt" icon={Icon.PlusCircle} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      {/* ── Debt Name ── */}
      <Form.TextField
        id="debtName"
        title="Debt Name"
        placeholder="e.g. Barclaycard Visa, Car Finance, Klarna"
        error={nameError}
        onChange={() => nameError && setNameError(undefined)}
        autoFocus
      />

      {/* ── Debt Type ── */}
      <Form.Dropdown id="debtType" title="Debt Type" value={debtType} onChange={setDebtType}>
        {DEBT_TYPE_OPTIONS.map((option) => (
          <Form.Dropdown.Item key={option.value} value={option.value} title={option.title} />
        ))}
      </Form.Dropdown>

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
        placeholder={isBNPL ? "0" : "e.g. 19.9"}
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
        error={repaymentDayError}
        onChange={() => repaymentDayError && setRepaymentDayError(undefined)}
        info="The day each month your repayment is due (1–31). Used to auto-track repayments."
      />

      {/* ── Currency Override ── */}
      <Form.Dropdown
        id="currency"
        title="Currency"
        defaultValue={baseCurrency}
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
            title="📅 Loan Term (Optional)"
            text="Provide start and end dates to enable progress tracking and auto-calculate the amortised monthly repayment."
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
        text={
          isLoanType
            ? "Add a loan to track repayment progress. Balance will auto-update on your repayment day each month."
            : isBNPL
              ? "Add a BNPL plan. Typically 0% APR with fixed monthly instalments."
              : "Add a debt to track your repayment progress. Balance will auto-update on your repayment day each month."
        }
      />
    </Form>
  );
}

// ──────────────────────────────────────────
// Currency Options (shared with AddCashForm)
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
