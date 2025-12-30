import { ActionPanel, Action, Icon, Detail, Form, showToast, Toast, List, Color, useNavigation } from "@raycast/api";
import { useForm, FormValidation } from "@raycast/utils";
import { formatCurrency, formatSignedCurrency } from "./format";
import type { Transaction, Category, Tag } from "./api";
import { useLunchMoney } from "./api";

export function generateMonthOptions() {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth(); // 0-11

  const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  const options: { value: string; title: string }[] = [];

  // Start from current month and work backwards through the year
  for (let i = currentMonth; i >= 0; i--) {
    const monthName = months[i];
    const value = `${currentYear}-${String(i + 1).padStart(2, "0")}`;
    options.push({
      value,
      title: `${monthName} ${currentYear}`,
    });
  }

  return options;
}

function formatDateToYYYYMMDD(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getDateRange(monthValue: string) {
  const [year, month] = monthValue.split("-").map(Number);

  // First day of the month
  const start = new Date(year, month - 1, 1);

  // Last day of the month
  const end = new Date(year, month, 0);

  return {
    start: formatDateToYYYYMMDD(start),
    end: formatDateToYYYYMMDD(end),
  };
}

export function getDateRangeForFilter(filter: string): {
  start: string;
  end: string;
} {
  const now = new Date();
  let start: Date;
  let end: Date;

  switch (filter) {
    case "7days":
      end = new Date(now);
      start = new Date(now);
      start.setDate(start.getDate() - 7);
      break;
    case "30days":
      end = new Date(now);
      start = new Date(now);
      start.setDate(start.getDate() - 30);
      break;
    case "90days":
      end = new Date(now);
      start = new Date(now);
      start.setDate(start.getDate() - 90);
      break;
    case "thisMonth":
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      break;
    case "lastMonth":
      start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      end = new Date(now.getFullYear(), now.getMonth(), 0);
      break;
    case "thisYear":
      start = new Date(now.getFullYear(), 0, 1);
      end = new Date(now.getFullYear(), 11, 31);
      break;
    case "lastYear":
      start = new Date(now.getFullYear() - 1, 0, 1);
      end = new Date(now.getFullYear() - 1, 11, 31);
      break;
    default:
      return getDateRange(filter);
  }

  return {
    start: formatDateToYYYYMMDD(start),
    end: formatDateToYYYYMMDD(end),
  };
}

export function DateRangeDropdown({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const monthOptions = generateMonthOptions();

  return (
    <List.Dropdown tooltip="Select Time Range" value={value} onChange={onChange}>
      <List.Dropdown.Section title="Quick Ranges">
        <List.Dropdown.Item value="7days" title="Last 7 Days" />
        <List.Dropdown.Item value="30days" title="Last 30 Days" />
        <List.Dropdown.Item value="90days" title="Last 90 Days" />
        <List.Dropdown.Item value="thisMonth" title="This Month" />
        <List.Dropdown.Item value="lastMonth" title="Last Month" />
        <List.Dropdown.Item value="thisYear" title="This Year" />
        <List.Dropdown.Item value="lastYear" title="Last Year" />
      </List.Dropdown.Section>
      <List.Dropdown.Section title="By Month">
        {monthOptions.map((option) => (
          <List.Dropdown.Item key={option.value} value={option.value} title={option.title} />
        ))}
      </List.Dropdown.Section>
    </List.Dropdown>
  );
}

export interface TransactionListItemProps {
  transaction: Transaction;
  categories?: Category[];
  tags?: Tag[];
  onRevalidate?: () => void;
  lunchMoneyUrl?: string;
  copyAllText?: string;
}

export function TransactionListItem({
  transaction,
  categories = [],
  tags = [],
  onRevalidate,
  lunchMoneyUrl = "https://my.lunchmoney.app/transactions",
  copyAllText,
}: TransactionListItemProps) {
  const client = useLunchMoney();

  async function handleToggleReviewStatus() {
    try {
      const newStatus = transaction.status === "reviewed" ? "unreviewed" : "reviewed";
      const { error } = await client.PUT("/transactions/{id}", {
        params: { path: { id: transaction.id } },
        body: {
          status: newStatus,
        },
      });
      if (error) {
        console.error("Toggle review status error:", error);
        throw new Error(JSON.stringify(error));
      }
      await showToast({
        style: Toast.Style.Success,
        title: newStatus === "reviewed" ? "Marked as reviewed" : "Marked as unreviewed",
      });
      if (onRevalidate) {
        onRevalidate();
      }
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to update review status",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  // Get category to check if it's income
  const category = categories.find((c) => c.id === transaction.category_id);
  const isIncome = category?.is_income ?? false;

  const formattedAmount = formatCurrency(transaction.amount, transaction.currency, isIncome);
  const isReviewed = transaction.status === "reviewed";
  const isRecurring = transaction.recurring_id !== null;
  const isPending = transaction.is_pending ?? false;

  // Get tag objects from tag_ids
  const transactionTags = (transaction.tag_ids || [])
    .map((tagId) => tags.find((t) => t.id === tagId))
    .filter((t): t is Tag => t !== undefined);

  // Determine icon based on status
  let statusIcon: { source: Icon; tintColor: Color };
  if (isPending) {
    statusIcon = { source: Icon.Clock, tintColor: Color.SecondaryText };
  } else if (isRecurring) {
    statusIcon = { source: Icon.Repeat, tintColor: Color.Blue };
  } else if (isReviewed) {
    statusIcon = { source: Icon.CheckCircle, tintColor: Color.SecondaryText };
  } else {
    statusIcon = { source: Icon.Circle, tintColor: Color.SecondaryText };
  }

  // Truncate payee for display
  const maxPayeeLength = 30;
  const truncatedPayee =
    (transaction.payee || "Unknown").length > maxPayeeLength
      ? (transaction.payee || "Unknown").slice(0, maxPayeeLength) + "…"
      : transaction.payee || "Unknown";

  // Format date - show year if not current year
  const transactionDate = new Date(transaction.date + "T00:00:00");
  const currentYear = new Date().getFullYear();
  const isCurrentYear = transactionDate.getFullYear() === currentYear;
  const dateText = transactionDate.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    ...(isCurrentYear ? {} : { year: "numeric" }),
  });

  // Keywords for filtering - include payee, category, notes, tags
  const keywords = [
    transaction.payee,
    category?.name,
    transaction.notes,
    ...transactionTags.map((tag) => tag.name),
  ].filter((k): k is string => Boolean(k));

  return (
    <List.Item
      key={transaction.id}
      icon={isIncome ? { source: Icon.ArrowUp, tintColor: Color.Green } : statusIcon}
      title={{ value: formattedAmount, tooltip: isIncome ? "Income" : "Expense" }}
      subtitle={truncatedPayee}
      keywords={keywords}
      accessories={[
        ...transactionTags.map((tag) => ({ tag: { value: tag.name }, icon: Icon.Tag })),
        { tag: { value: category?.name || "Uncategorized" }, icon: Icon.Folder },
        {
          text: dateText,
          tooltip: transactionDate.toLocaleDateString("en-US", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          }),
        },
      ]}
      actions={
        <ActionPanel>
          <Action.Push
            title="View Details"
            icon={Icon.Eye}
            target={
              <TransactionDetail
                transaction={transaction}
                categories={categories}
                tags={tags}
                lunchMoneyUrl={lunchMoneyUrl}
                onRevalidate={onRevalidate}
              />
            }
          />
          <Action
            title={isReviewed ? "Mark as Unreviewed" : "Mark as Reviewed"}
            icon={isReviewed ? Icon.Circle : Icon.CheckCircle}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
            onAction={handleToggleReviewStatus}
          />
          <Action.Push
            title="Edit Transaction"
            icon={Icon.Pencil}
            shortcut={{ modifiers: ["cmd"], key: "e" }}
            target={
              <EditTransactionForm
                transaction={transaction}
                categories={categories}
                tags={tags}
                onRevalidate={onRevalidate}
              />
            }
          />
          <Action.OpenInBrowser
            title="Open in Lunch Money"
            url={lunchMoneyUrl}
            shortcut={{ modifiers: ["cmd"], key: "o" }}
          />
          <Action.CopyToClipboard content={`${transaction.payee} - ${formattedAmount}`} title="Copy Transaction" />
          {copyAllText && (
            <Action.CopyToClipboard
              title="Copy Shown Transactions"
              content={copyAllText}
              shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
            />
          )}
        </ActionPanel>
      }
    />
  );
}

interface EditTransactionFormValues {
  date: Date | null;
  notes: string;
  category: string;
  tags: string[];
}

export function EditTransactionForm({
  transaction,
  categories,
  tags,
  onRevalidate,
}: {
  transaction: Transaction;
  categories: Category[];
  tags: Tag[];
  onRevalidate?: () => void;
}) {
  const { pop } = useNavigation();
  const client = useLunchMoney();

  const currentCategory = categories.find((c) => c.id === transaction.category_id);
  const transactionTags = transaction.tag_ids
    .map((tagId) => tags.find((t) => t.id === tagId))
    .filter((t): t is Tag => t !== undefined);

  // Parse the transaction date (format: YYYY-MM-DD)
  const transactionDate = new Date(transaction.date + "T00:00:00");

  const { handleSubmit, itemProps } = useForm<EditTransactionFormValues>({
    onSubmit: async (formValues) => {
      try {
        const tagIds = formValues.tags
          .map((name) => tags.find((t: Tag) => t.name === name)?.id)
          .filter((id): id is number => id !== undefined);

        // Format date as YYYY-MM-DD
        const formattedDate = formValues.date
          ? `${formValues.date.getFullYear()}-${String(formValues.date.getMonth() + 1).padStart(2, "0")}-${String(formValues.date.getDate()).padStart(2, "0")}`
          : transaction.date;

        const { error } = await client.PUT("/transactions/{id}", {
          params: { path: { id: transaction.id } },
          body: {
            date: formattedDate,
            notes: formValues.notes || null,
            category_id: parseInt(formValues.category),
            tag_ids: tagIds,
          },
        });

        if (error) {
          console.error("Update transaction error:", error);
          throw new Error(JSON.stringify(error));
        }

        await showToast({
          style: Toast.Style.Success,
          title: "Transaction updated",
        });

        if (onRevalidate) {
          onRevalidate();
        }
        pop();
      } catch (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to update transaction",
          message: String(error),
        });
      }
    },
    initialValues: {
      date: transactionDate,
      notes: transaction.notes ?? "",
      category: currentCategory?.id.toString() ?? "",
      tags: transactionTags.map((t) => t.name),
    },
    validation: {
      category: FormValidation.Required,
      date: FormValidation.Required,
    },
  });

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Changes" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description text={`Editing: ${transaction.payee}`} />
      <Form.DatePicker title="Date" type={Form.DatePicker.Type.Date} {...itemProps.date} />
      <Form.TextArea title="Notes" placeholder="Add notes or memo..." {...itemProps.notes} />
      <Form.Dropdown title="Category" {...itemProps.category}>
        {categories.map((category) => (
          <Form.Dropdown.Item key={category.id} value={category.id.toString()} title={category.name} />
        ))}
      </Form.Dropdown>
      <Form.TagPicker title="Tags" {...itemProps.tags}>
        {tags.map((tag) => (
          <Form.TagPicker.Item key={tag.id} value={tag.name} title={tag.name} />
        ))}
      </Form.TagPicker>
    </Form>
  );
}

export function TransactionDetail({
  transaction,
  categories = [],
  tags = [],
  onRevalidate,
  lunchMoneyUrl,
}: {
  transaction: Transaction;
  categories?: Category[];
  tags?: Tag[];
  onRevalidate?: () => void;
  lunchMoneyUrl?: string;
}) {
  const originalAmount = typeof transaction.amount === "string" ? parseFloat(transaction.amount) : transaction.amount;
  const isExpense = originalAmount > 0;

  // Get category to check if it's income
  const category = categories.find((c) => c.id === transaction.category_id);
  const isIncome = category?.is_income ?? false;

  const formattedAmount = formatSignedCurrency(transaction.amount, transaction.currency, { isIncome, isExpense });
  const isReviewed = transaction.status === "reviewed";

  // Get tag objects from tag_ids
  const transactionTags = transaction.tag_ids
    .map((tagId) => tags.find((t) => t.id === tagId))
    .filter((t): t is Tag => t !== undefined);

  return (
    <Detail
      markdown={`# ${transaction.payee}\n\n${formattedAmount}`}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label
            title="Amount"
            text={formattedAmount}
            icon={{
              source: isExpense ? Icon.ArrowDown : Icon.ArrowUp,
              tintColor: isExpense ? "#FF0000" : "#00FF00",
            }}
          />
          <Detail.Metadata.Label title="Date" text={transaction.date} icon={Icon.Calendar} />

          <Detail.Metadata.Separator />

          <Detail.Metadata.TagList title="Status">
            <Detail.Metadata.TagList.Item
              text={isReviewed ? "Reviewed" : "Unreviewed"}
              color={isReviewed ? "#00FF00" : "#FFA500"}
              icon={isReviewed ? Icon.CheckCircle : Icon.Circle}
            />
          </Detail.Metadata.TagList>

          <Detail.Metadata.Label title="Category" text={category?.name || "Uncategorized"} icon={Icon.Tag} />

          {transactionTags.length > 0 && (
            <Detail.Metadata.TagList title="Tags">
              {transactionTags.map((tag) => (
                <Detail.Metadata.TagList.Item key={tag.id} text={tag.name} />
              ))}
            </Detail.Metadata.TagList>
          )}

          {transaction.notes && (
            <>
              <Detail.Metadata.Separator />
              <Detail.Metadata.Label title="Notes" text={transaction.notes} />
            </>
          )}

          <Detail.Metadata.Separator />

          <Detail.Metadata.Label title="Currency" text={transaction.currency.toUpperCase()} icon={Icon.BankNote} />
          <Detail.Metadata.Label title="Transaction ID" text={transaction.id.toString()} />

          {lunchMoneyUrl && (
            <>
              <Detail.Metadata.Separator />
              <Detail.Metadata.Link title="View in Lunch Money" target={lunchMoneyUrl} text="Open Transaction" />
            </>
          )}
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action.Push
            title="Edit Transaction"
            icon={Icon.Pencil}
            shortcut={{ modifiers: ["cmd"], key: "e" }}
            target={
              <EditTransactionForm
                transaction={transaction}
                categories={categories}
                tags={tags}
                onRevalidate={onRevalidate}
              />
            }
          />
          {lunchMoneyUrl && (
            <Action.OpenInBrowser
              title="Open in Lunch Money"
              url={lunchMoneyUrl}
              shortcut={{ modifiers: ["cmd"], key: "o" }}
            />
          )}
          <Action.CopyToClipboard content={`${transaction.payee} - ${formattedAmount}`} title="Copy Transaction" />
        </ActionPanel>
      }
    />
  );
}
