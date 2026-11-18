// fallow-ignore-next-line unresolved-import
import { Action, ActionPanel, Color, Icon, List, openExtensionPreferences } from "@raycast/api";
// fallow-ignore-next-line unresolved-import
import { Toast, confirmAlert, showToast } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useMemo, useRef, useState } from "react";
import {
  getExpense,
  getExpenses,
  getTags,
  getWorkspaceContext,
  setExpensePaymentStatus,
  toFriendlyError,
} from "./api/client";
import { FIGA_DEVELOPER_API_DOCS_URL, getFigaExpenseUrl, getFigaExpensesUrl } from "./api/links";
import type {
  FigaExpensePaymentStatusPayload,
  FigaExpense,
  FigaExpenseListQuery,
  FigaExpenseListResponse,
  FigaWorkspaceContext,
  FigaTag,
} from "./api/types";
import { ExpensePaymentPermissionDetail, ReadCapabilityGate } from "./read-capability-gate";
import { loadOptionalTags } from "./optional-tags";
import {
  canRecordExpensePayments,
  canReadResource,
  formatMoney,
  formatMonthLabel,
  formatExpenseDate,
  formatExpenseAmount,
  getCurrentMonth,
  getExpenseTagNames,
  getWorkspaceBaseCurrency,
} from "./format";

const STATUS_FILTERS = [
  { value: "all", title: "All Expenses" },
  { value: "unpaid", title: "Unpaid" },
  { value: "paid", title: "Paid" },
] as const;

type ExpenseStatusFilter = (typeof STATUS_FILTERS)[number]["value"];

interface ExpenseCommandData {
  context: FigaWorkspaceContext;
  expenses?: FigaExpenseListResponse;
  tags?: FigaTag[];
  tagsWarning?: string;
}

interface PaymentAttempt {
  payload: FigaExpensePaymentStatusPayload;
  idempotencyKey: string;
}

export default function Command() {
  const currentMonth = useMemo(getCurrentMonth, []);
  const [statusFilter, setStatusFilter] = useState<ExpenseStatusFilter>("all");
  const state = usePromise(loadExpenseCommandData, [currentMonth.year, currentMonth.month, statusFilter]);

  return (
    <ExpenseCommandView
      currentMonth={currentMonth}
      statusFilter={statusFilter}
      onStatusFilterChange={setStatusFilter}
      {...state}
    />
  );
}

function ExpenseCommandView({
  currentMonth,
  statusFilter,
  onStatusFilterChange,
  data,
  error,
  isLoading,
  revalidate,
}: {
  currentMonth: { year: number; month: number };
  statusFilter: ExpenseStatusFilter;
  onStatusFilterChange: (value: ExpenseStatusFilter) => void;
  data?: ExpenseCommandData;
  error?: unknown;
  isLoading: boolean;
  revalidate: () => void;
}) {
  const metadata = data?.expenses?.metadata;
  const monthLabel = formatMonthLabel(currentMonth);

  return (
    <ReadCapabilityGate context={data?.context} error={error} onRetry={revalidate} resource="expenses">
      <List
        isLoading={isLoading}
        searchBarPlaceholder={`Search ${monthLabel} expenses`}
        searchBarAccessory={<StatusFilterDropdown value={statusFilter} onChange={onStatusFilterChange} />}
      >
        <List.EmptyView
          icon={Icon.Receipt}
          title={getEmptyTitle(isLoading)}
          description={[buildEmptyDescription(statusFilter, monthLabel), data?.tagsWarning].filter(Boolean).join(" ")}
          actions={<ListLevelActions data={data} onRefresh={revalidate} />}
        />
        <ExpenseListSection
          data={data}
          month={currentMonth}
          metadata={metadata}
          monthLabel={monthLabel}
          statusFilter={statusFilter}
          onRefresh={revalidate}
        />
      </List>
    </ReadCapabilityGate>
  );
}

async function loadExpenseCommandData(
  year: number,
  month: number,
  statusFilter: ExpenseStatusFilter,
): Promise<ExpenseCommandData> {
  const context = await getWorkspaceContext();
  if (!canReadResource(context, "expenses")) return { context };

  const [expenses, tags] = await Promise.all([
    getExpenses(buildExpenseListQuery(year, month, statusFilter)),
    loadOptionalTags(canReadResource(context, "tags") ? getTags() : undefined),
  ]);
  return { context, expenses, ...tags };
}

function buildExpenseListQuery(year: number, month: number, statusFilter: ExpenseStatusFilter): FigaExpenseListQuery {
  return {
    year,
    month,
    includeTemplates: true,
    showPaidOnly: statusFilter === "paid" ? true : undefined,
    showUnpaidOnly: statusFilter === "unpaid" ? true : undefined,
  };
}

function StatusFilterDropdown({
  value,
  onChange,
}: {
  value: ExpenseStatusFilter;
  onChange: (value: ExpenseStatusFilter) => void;
}) {
  return (
    <List.Dropdown
      tooltip="Expense View"
      value={value}
      onChange={(nextValue) => onChange(nextValue as ExpenseStatusFilter)}
    >
      {STATUS_FILTERS.map((filter) => (
        <List.Dropdown.Item key={filter.value} value={filter.value} title={filter.title} />
      ))}
    </List.Dropdown>
  );
}

function ExpenseListItem({
  context,
  tags,
  expense,
  month,
  onRefresh,
}: {
  context: FigaWorkspaceContext;
  tags?: FigaTag[];
  expense: FigaExpense;
  month: { year: number; month: number };
  onRefresh: () => void;
}) {
  const currency = expense.currency ?? getWorkspaceBaseCurrency(context);
  const formattedAmount = formatExpenseAmount(expense, currency);
  const expenseDate = formatExpenseDate(expense);
  const status = getExpenseStatus(expense);
  const tagNames = getExpenseTagNames(expense, tags ?? []);

  return (
    <List.Item
      id={expense.id}
      icon={getExpenseIcon(expense)}
      title={expense.name}
      subtitle={[buildExpenseSubtitle(expense), ...tagNames.map((name) => `#${name}`)].filter(Boolean).join(" · ")}
      keywords={[...getExpenseKeywords(expense, formattedAmount, expenseDate), ...tagNames]}
      accessories={[
        { text: formattedAmount, icon: Icon.Coins },
        { text: { value: status.title, color: status.color }, icon: status.icon },
        { text: expenseDate, icon: Icon.Calendar },
      ]}
      actions={
        <ExpenseActions
          context={context}
          expense={expense}
          formattedAmount={formattedAmount}
          month={month}
          onRefresh={onRefresh}
        />
      }
    />
  );
}

function ExpenseListSection({
  data,
  month,
  metadata,
  monthLabel,
  statusFilter,
  onRefresh,
}: {
  data?: ExpenseCommandData;
  month: { year: number; month: number };
  metadata?: FigaExpenseListResponse["metadata"];
  monthLabel: string;
  statusFilter: ExpenseStatusFilter;
  onRefresh: () => void;
}) {
  if (!data?.expenses) return null;

  return (
    <List.Section title={buildSectionTitle(statusFilter, monthLabel, metadata)} subtitle={data.tagsWarning}>
      {data.expenses.expenses.map((expense) => (
        <ExpenseListItem
          key={expense.id}
          context={data.context}
          tags={data.tags}
          expense={expense}
          month={month}
          onRefresh={onRefresh}
        />
      ))}
    </List.Section>
  );
}

function ExpenseActions({
  context,
  expense,
  formattedAmount,
  month,
  onRefresh,
}: {
  context: FigaWorkspaceContext;
  expense: FigaExpense;
  formattedAmount: string;
  month: { year: number; month: number };
  onRefresh: () => void;
}) {
  const expenseUrl = getFigaExpenseUrl(context.workspace.id, getExpenseNavigationId(expense));
  const expensesUrl = getFigaExpensesUrl(context.workspace.id, month);
  const currency = expense.currency ?? getWorkspaceBaseCurrency(context);

  return (
    <ActionPanel>
      <Action.OpenInBrowser title="Open Expense in Figa" icon={Icon.Link} url={expenseUrl} />
      <ExpensePaymentAction context={context} currency={currency} expense={expense} onRefresh={onRefresh} />
      <Action.CopyToClipboard title="Copy Expense Name" icon={Icon.CopyClipboard} content={expense.name} />
      <Action.Paste title="Paste Expense Name" icon={Icon.Clipboard} content={expense.name} />
      <Action.CopyToClipboard title="Copy Amount" icon={Icon.Coins} content={formattedAmount} />
      <Action.Paste title="Paste Amount" icon={Icon.Coins} content={formattedAmount} />
      <Action.CopyToClipboard title="Copy Expense ID" icon={Icon.Hashtag} content={expense.id} />
      <Action.OpenInBrowser title="Open Current Month Expenses" icon={Icon.List} url={expensesUrl} />
      <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={onRefresh} />
    </ActionPanel>
  );
}

function ExpensePaymentAction({
  context,
  currency,
  expense,
  onRefresh,
}: {
  context: FigaWorkspaceContext;
  currency: string;
  expense: FigaExpense;
  onRefresh: () => void;
}) {
  const [isRecordingPayment, setIsRecordingPayment] = useState(false);
  const paymentAttemptRef = useRef<PaymentAttempt | null>(null);
  const expenseIdRef = useRef(expense.id);

  if (expenseIdRef.current !== expense.id) {
    expenseIdRef.current = expense.id;
    paymentAttemptRef.current = null;
  }

  if (!canOfferPaymentAction(expense)) return null;

  if (expense.amount === null || (expense.bill && expense.bill.state !== "confirmed")) {
    return (
      <Action.OpenInBrowser
        title="Confirm Bill Amount in Figa"
        icon={Icon.Link}
        url={getFigaExpenseUrl(context.workspace.id, getExpenseNavigationId(expense))}
      />
    );
  }

  if (!canRecordExpensePayments(context)) {
    return (
      <Action.Push
        title="Payment Permission Required"
        icon={Icon.Key}
        target={<ExpensePaymentPermissionDetail context={context} onRetry={onRefresh} />}
      />
    );
  }

  return (
    <Action
      title={isRecordingPayment ? "Updating Status" : "Mark Expense Paid"}
      icon={Icon.CheckCircle}
      onAction={() => {
        if (isRecordingPayment) return;
        void markExpensePaid({
          clearPaymentAttempt: () => {
            paymentAttemptRef.current = null;
          },
          currency,
          expense,
          getPaymentAttempt: () => paymentAttemptRef.current,
          setPaymentAttempt: (attempt) => {
            paymentAttemptRef.current = attempt;
          },
          onRefresh,
          setIsRecordingPayment,
        });
      }}
    />
  );
}

async function markExpensePaid({
  clearPaymentAttempt,
  currency,
  expense,
  getPaymentAttempt,
  setPaymentAttempt,
  onRefresh,
  setIsRecordingPayment,
}: {
  clearPaymentAttempt: () => void;
  currency: string;
  expense: FigaExpense;
  getPaymentAttempt: () => PaymentAttempt | null;
  setPaymentAttempt: (attempt: PaymentAttempt) => void;
  onRefresh: () => void;
  setIsRecordingPayment: (value: boolean) => void;
}) {
  setIsRecordingPayment(true);
  const toast = await showToast({ style: Toast.Style.Animated, title: "Checking expense", message: expense.name });
  try {
    let attempt = getPaymentAttempt();
    if (!attempt) {
      const current = (await getExpense(expense.id)).expense;
      if (current.isPaid) {
        toast.style = Toast.Style.Success;
        toast.title = "Expense already paid";
        onRefresh();
        return;
      }
      if (current.amount == null || (current.bill && current.bill.state !== "confirmed") || current.isSkipped) {
        toast.style = Toast.Style.Failure;
        toast.title = "Confirm the actual bill in Figa first";
        return;
      }
      if (
        !current.editContext ||
        current.paymentStatusRevision === undefined ||
        current.paymentStatusRevision !== expense.paymentStatusRevision ||
        current.amount !== expense.amount ||
        current.currency !== expense.currency
      ) {
        toast.style = Toast.Style.Failure;
        toast.title = "Expense changed";
        toast.message = "Refresh the expense before changing its status.";
        onRefresh();
        return;
      }
      const confirmed = await confirmAlert({
        icon: Icon.CheckCircle,
        title: "Mark Expense Paid?",
        message: `${expense.name}: ${formatMoney(current.amount, current.currency || currency)}. This changes its status without recording a payment.`,
        primaryAction: { title: "Mark Paid" },
      });
      if (!confirmed) {
        await toast.hide();
        return;
      }
      attempt = {
        idempotencyKey: crypto.randomUUID(),
        payload: {
          isPaid: true,
          expectedEditContext: current.editContext,
          expectedPaymentStatusRevision: current.paymentStatusRevision,
          expectedBillRevision: current.bill?.state === "confirmed" ? current.bill.revision : undefined,
        },
      };
      setPaymentAttempt(attempt);
    }
    toast.title = "Updating status";
    await setExpensePaymentStatus(expense.id, attempt.payload, attempt.idempotencyKey);
    // A cached receipt must not claim Paid after a later Unpaid.
    const current = (await getExpense(expense.id)).expense;
    toast.style = current.isPaid ? Toast.Style.Success : Toast.Style.Failure;
    toast.title = current.isPaid ? "Expense marked paid" : "Payment status has since changed";
    toast.message = expense.name;
    clearPaymentAttempt();
    onRefresh();
  } catch (error) {
    const friendly = toFriendlyError(error);
    toast.style = Toast.Style.Failure;
    toast.title = friendly.title;
    toast.message = friendly.message;
    if (
      [
        "EXPENSE_WRITE_CONFLICT",
        "PAYMENT_WRITE_CONFLICT",
        "BILL_WRITE_CONFLICT",
        "LEGACY_PAYMENT_OPERATION_REMOVED",
      ].includes(friendly.code || "")
    ) {
      clearPaymentAttempt();
      onRefresh();
    }
  } finally {
    setIsRecordingPayment(false);
  }
}

function canOfferPaymentAction(expense: FigaExpense): boolean {
  return !expense.isPaid && !expense.isSkipped && expense.instanceType !== "template";
}

function ListLevelActions({ data, onRefresh }: { data?: ExpenseCommandData; onRefresh: () => void }) {
  return (
    <ActionPanel>
      <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={onRefresh} />
      {data ? (
        <Action.OpenInBrowser
          title="Open Expenses in Figa"
          icon={Icon.List}
          url={getFigaExpensesUrl(data.context.workspace.id)}
        />
      ) : null}
      <Action title="Open Extension Preferences" icon={Icon.Cog} onAction={openExtensionPreferences} />
      <Action.OpenInBrowser title="Open Developer API Docs" icon={Icon.Book} url={FIGA_DEVELOPER_API_DOCS_URL} />
    </ActionPanel>
  );
}

function buildExpenseSubtitle(expense: FigaExpense): string {
  return [expense.context.categoryName, expense.context.recipientName ?? "No recipient"].filter(Boolean).join(" · ");
}

function buildSectionTitle(
  statusFilter: ExpenseStatusFilter,
  monthLabel: string,
  metadata?: FigaExpenseListResponse["metadata"],
): string {
  const prefix = STATUS_FILTERS.find((filter) => filter.value === statusFilter)?.title ?? "Expenses";
  if (!metadata) return `${prefix} · ${monthLabel}`;
  const restricted = metadata.planLimit?.restricted || (metadata.planLimit?.blocked ?? 0) > 0;
  return `${prefix} · ${monthLabel} · ${metadata.totalCount} visible${restricted ? " · Limited by plan" : ""}`;
}

function buildEmptyDescription(statusFilter: ExpenseStatusFilter, monthLabel: string): string {
  if (statusFilter === "paid") return `No paid expenses were returned for ${monthLabel}.`;
  if (statusFilter === "unpaid") return `No unpaid expenses were returned for ${monthLabel}.`;
  return `No expenses were returned for ${monthLabel}.`;
}

function getEmptyTitle(isLoading: boolean): string {
  return isLoading ? "Loading expenses" : "No expenses found";
}

function getExpenseKeywords(expense: FigaExpense, amount: string, expenseDate: string): string[] {
  return [
    expense.context.categoryName,
    expense.context.recipientName,
    expense.description,
    amount,
    expenseDate,
    expense.isPaid ? "paid" : "unpaid",
    expense.isRecurring ? "recurring" : "one-time",
  ].filter(isPresentString);
}

function isPresentString(value: string | null | undefined): value is string {
  return Boolean(value);
}

function getExpenseStatus(expense: FigaExpense): { title: string; color: Color; icon: Icon } {
  if (expense.isSkipped) return { title: "Skipped", color: Color.SecondaryText, icon: Icon.MinusCircle };
  if (expense.isPaid) return { title: "Paid", color: Color.Green, icon: Icon.CheckCircle };
  return { title: "Unpaid", color: Color.Yellow, icon: Icon.Circle };
}

function getExpenseIcon(expense: FigaExpense) {
  if (expense.isRecurring) return { source: Icon.Repeat, tintColor: Color.Blue };
  return { source: Icon.Receipt, tintColor: Color.SecondaryText };
}

function getExpenseNavigationId(expense: FigaExpense): string {
  return expense.isRecurring && expense.templateId ? expense.templateId : expense.id;
}
