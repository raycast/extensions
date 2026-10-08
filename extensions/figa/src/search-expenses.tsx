// fallow-ignore-next-line unresolved-import
import { Action, ActionPanel, Color, Icon, Keyboard, List, openExtensionPreferences } from "@raycast/api";
// fallow-ignore-next-line unresolved-import
import { Toast, confirmAlert, showToast } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useMemo, useRef, useState } from "react";
import {
  getExpensePayments,
  getExpenses,
  getWorkspaceContext,
  recordExpensePayment,
  toFriendlyError,
} from "./api/client";
import { FIGA_DEVELOPER_API_DOCS_URL, getFigaExpenseUrl, getFigaExpensesUrl } from "./api/links";
import type { FigaExpense, FigaExpenseListQuery, FigaExpenseListResponse, FigaWorkspaceContext } from "./api/types";
import { ExpensePaymentPermissionDetail, ReadCapabilityGate } from "./read-capability-gate";
import {
  canRecordExpensePayments,
  canReadResource,
  formatMoney,
  formatMonthLabel,
  formatUnixDate,
  getCurrentMonth,
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
}

interface PaymentAttempt {
  amount: number;
  idempotencyKey: string;
  paymentDate: number;
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
          description={buildEmptyDescription(statusFilter, monthLabel)}
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

  const expenses = await getExpenses(buildExpenseListQuery(year, month, statusFilter));
  return { context, expenses };
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
  expense,
  month,
  onRefresh,
}: {
  context: FigaWorkspaceContext;
  expense: FigaExpense;
  month: { year: number; month: number };
  onRefresh: () => void;
}) {
  const currency = expense.currency ?? getWorkspaceBaseCurrency(context);
  const formattedAmount = formatMoney(expense.amount, currency);
  const expenseDate = formatUnixDate(expense.expenseDate);
  const status = getExpenseStatus(expense);

  return (
    <List.Item
      id={expense.id}
      icon={getExpenseIcon(expense)}
      title={expense.name}
      subtitle={buildExpenseSubtitle(expense)}
      keywords={getExpenseKeywords(expense, formattedAmount, expenseDate)}
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
    <List.Section title={buildSectionTitle(statusFilter, monthLabel, metadata)}>
      {data.expenses.expenses.map((expense) => (
        <ExpenseListItem
          key={expense.id}
          context={data.context}
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
      <Action.OpenInBrowser
        title="Open Expense in Figa"
        icon={Icon.Link}
        url={expenseUrl}
        shortcut={Keyboard.Shortcut.Common.Open}
      />
      <ExpensePaymentAction context={context} currency={currency} expense={expense} onRefresh={onRefresh} />
      <Action.CopyToClipboard
        title="Copy Expense Name"
        icon={Icon.CopyClipboard}
        content={expense.name}
        shortcut={Keyboard.Shortcut.Common.CopyName}
      />
      <Action.Paste title="Paste Expense Name" icon={Icon.Clipboard} content={expense.name} />
      <Action.CopyToClipboard
        title="Copy Amount"
        icon={Icon.Coins}
        content={formattedAmount}
        shortcut={Keyboard.Shortcut.Common.Copy}
      />
      <Action.Paste title="Paste Amount" icon={Icon.Coins} content={formattedAmount} />
      <Action.CopyToClipboard title="Copy Expense ID" icon={Icon.Hashtag} content={expense.id} />
      <Action.OpenInBrowser
        title="Open Current Month Expenses"
        icon={Icon.List}
        url={expensesUrl}
        shortcut={Keyboard.Shortcut.Common.OpenWith}
      />
      <Action
        title="Refresh"
        icon={Icon.ArrowClockwise}
        shortcut={Keyboard.Shortcut.Common.Refresh}
        onAction={onRefresh}
      />
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
      title={isRecordingPayment ? "Recording Payment" : "Mark Expense Paid"}
      icon={Icon.CheckCircle}
      onAction={() => {
        if (isRecordingPayment) return;
        void markExpensePaid({
          clearPaymentAttempt: () => {
            paymentAttemptRef.current = null;
          },
          currency,
          expense,
          getPaymentAttempt: (amount) => {
            if (paymentAttemptRef.current?.amount !== amount) {
              paymentAttemptRef.current = {
                amount,
                idempotencyKey: crypto.randomUUID(),
                paymentDate: Math.floor(Date.now() / 1000),
              };
            }
            return paymentAttemptRef.current;
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
  onRefresh,
  setIsRecordingPayment,
}: {
  clearPaymentAttempt: () => void;
  currency: string;
  expense: FigaExpense;
  getPaymentAttempt: (amount: number) => PaymentAttempt;
  onRefresh: () => void;
  setIsRecordingPayment: (value: boolean) => void;
}) {
  setIsRecordingPayment(true);
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Checking payments",
    message: expense.name,
  });

  try {
    const paymentState = await getExpensePayments(expense.id);
    const remainingAmount = paymentState.metadata.remainingAmount;

    if (remainingAmount <= 0) {
      toast.style = Toast.Style.Success;
      toast.title = "Expense already paid";
      toast.message = expense.name;
      clearPaymentAttempt();
      onRefresh();
      return;
    }

    const confirmed = await confirmPaymentAction(expense, remainingAmount, currency);
    if (!confirmed) {
      clearPaymentAttempt();
      await toast.hide();
      return;
    }

    toast.title = "Recording payment";
    const paymentAttempt = getPaymentAttempt(remainingAmount);
    const response = await recordExpensePayment(
      expense.id,
      {
        amount: paymentAttempt.amount,
        paymentDate: paymentAttempt.paymentDate,
      },
      paymentAttempt.idempotencyKey,
    );

    toast.style = Toast.Style.Success;
    toast.title = "Payment recorded";
    toast.message = formatMoney(response.payment.amount, currency);
    clearPaymentAttempt();
    onRefresh();
  } catch (error) {
    const friendlyError = toFriendlyError(error);
    toast.style = Toast.Style.Failure;
    toast.title = friendlyError.title;
    toast.message = friendlyError.message;
  } finally {
    setIsRecordingPayment(false);
  }
}

function confirmPaymentAction(expense: FigaExpense, remainingAmount: number, currency: string): Promise<boolean> {
  return confirmAlert({
    icon: Icon.CheckCircle,
    title: "Mark Expense Paid?",
    message: `${expense.name} will be paid with a ${formatMoney(remainingAmount, currency)} payment.`,
    primaryAction: {
      title: "Record Payment",
    },
  });
}

function canOfferPaymentAction(expense: FigaExpense): boolean {
  return !expense.isPaid && !expense.isSkipped && expense.instanceType !== "template";
}

function ListLevelActions({ data, onRefresh }: { data?: ExpenseCommandData; onRefresh: () => void }) {
  return (
    <ActionPanel>
      <Action
        title="Refresh"
        icon={Icon.ArrowClockwise}
        shortcut={Keyboard.Shortcut.Common.Refresh}
        onAction={onRefresh}
      />
      {data ? (
        <Action.OpenInBrowser
          title="Open Expenses in Figa"
          icon={Icon.List}
          url={getFigaExpensesUrl(data.context.workspace.id)}
          shortcut={Keyboard.Shortcut.Common.Open}
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
  return `${prefix} · ${monthLabel} · ${metadata.totalCount} total`;
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
