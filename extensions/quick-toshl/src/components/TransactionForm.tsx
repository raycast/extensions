import { ActionPanel, Action, Form, useNavigation, showToast, Toast, Icon } from "@raycast/api";
import { useState, useMemo } from "react";
import { useCachedPromise } from "@raycast/utils";
import { toshl } from "../utils/toshl";
import { Transaction, TransactionInput } from "../utils/types";
import { format } from "date-fns";
import { CURRENCY_SYMBOLS } from "../utils/helpers";

interface TransactionFormProps {
  type: "expense" | "income";
  transaction?: Transaction;
  onSubmit?: (transaction: TransactionInput) => Promise<void>;
}

export function TransactionForm({ type, transaction, onSubmit }: TransactionFormProps) {
  const { pop } = useNavigation();
  const [isLoading, setIsLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>(transaction?.category);

  // Fetch Categories, Tags, Accounts
  const { data: categories, isLoading: isLoadingCategories } = useCachedPromise(() => toshl.getCategories());
  const { data: tags, isLoading: isLoadingTags } = useCachedPromise(() => toshl.getTags());
  const { data: accounts, isLoading: isLoadingAccounts } = useCachedPromise(() => toshl.getAccounts());
  const { data: currencies, isLoading: isLoadingCurrencies } = useCachedPromise(() => toshl.getCurrencies());

  // Get default currency from Toshl API (/me endpoint)
  const { data: defaultCurrency, isLoading: isLoadingDefaultCurrency } = useCachedPromise(() =>
    toshl.getDefaultCurrency(),
  );

  const filteredCategories = useMemo(() => {
    return categories?.filter((c) => c.type === type) || [];
  }, [categories, type]);

  // Filter tags by type AND selected category (if a category is selected)
  const filteredTags = useMemo(() => {
    let result = tags?.filter((t) => t.type === type) || [];
    if (selectedCategory) {
      result = result.filter((t) => t.category === selectedCategory);
    }
    return result;
  }, [tags, type, selectedCategory]);

  interface FormValues {
    amount: string;
    date: Date | null;
    description: string;
    category: string;
    tags: string[];
    account: string;
    currency: string;
    isRecurring: boolean;
    frequency: string;
    interval: string;
    endType: string;
    count: string;
    endDate: Date | null;
  }

  async function handleSubmit(values: FormValues) {
    if (!values.amount) {
      showToast({ style: Toast.Style.Failure, title: "Validation Error", message: "Amount is required" });
      return;
    }
    if (isNaN(Number(values.amount))) {
      showToast({ style: Toast.Style.Failure, title: "Validation Error", message: "Amount must be a number" });
      return;
    }

    setIsLoading(true);
    try {
      // Priority: User selected currency > User default from Toshl API > USD fallback
      const currencyCode = values.currency || defaultCurrency || "USD";
      const entryDate = values.date ? format(values.date, "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd");
      const newAmount = parseFloat(values.amount) * (type === "expense" ? -1 : 1);

      const isNewEntry = !transaction;

      if (isNewEntry) {
        // NEW ENTRY: Send full payload
        const payload: TransactionInput = {
          amount: newAmount,
          currency: { code: currencyCode },
          date: entryDate,
          desc: values.description || "",
        };

        if (values.account) payload.account = values.account;
        if (values.category) payload.category = values.category;
        if (values.tags && values.tags.length > 0) payload.tags = values.tags;

        // Add repeat for new recurring entries
        if (values.isRecurring && values.frequency) {
          payload.repeat = {
            frequency: values.frequency as "daily" | "weekly" | "monthly" | "yearly",
            interval: parseInt(values.interval) || 1,
            start: entryDate,
          };
          if (values.endType === "count" && values.count) {
            payload.repeat.count = parseInt(values.count);
          } else if (values.endType === "date" && values.endDate) {
            payload.repeat.end = format(values.endDate, "yyyy-MM-dd");
          }
        }

        await toshl.addTransaction(payload);
        showToast({ style: Toast.Style.Success, title: "Transaction Added" });
        pop();
      } else {
        // UPDATE: All these fields are REQUIRED by Toshl API
        // amount*, currency.code*, date*, account*, category*, modified*
        const updatePayload: TransactionInput = {
          amount: newAmount,
          currency: {
            code: currencyCode,
            rate: transaction.currency.rate ?? 1,
            fixed: transaction.currency.fixed ?? false,
          },
          date: entryDate,
          desc: values.description ?? transaction.desc ?? "",
          account: values.account && values.account !== "" ? values.account : transaction.account,
          category: values.category && values.category !== "" ? values.category : transaction.category,
          tags: values.tags && values.tags.length > 0 ? values.tags : (transaction.tags ?? []),
          modified: transaction.modified,
        };

        console.log("Update payload:", JSON.stringify(updatePayload, null, 2));

        if (onSubmit) {
          await onSubmit(updatePayload);
        }
      }
    } catch {
      // Error handled in interceptor mostly, but ensure loading state is reset
    } finally {
      setIsLoading(false);
    }
  }

  // Helper to format default date
  const defaultDate = transaction ? new Date(transaction.date) : new Date();

  return (
    <Form
      isLoading={
        isLoading ||
        isLoadingCategories ||
        isLoadingTags ||
        isLoadingAccounts ||
        isLoadingCurrencies ||
        isLoadingDefaultCurrency
      }
      navigationTitle={transaction ? "Edit Transaction" : "New Transaction"}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={transaction ? "Update Transaction" : "Add Transaction"}
            onSubmit={handleSubmit}
            icon={Icon.Check}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="amount"
        title="Amount"
        placeholder="0.00"
        defaultValue={transaction ? Math.abs(transaction.amount).toString() : ""}
      />

      <Form.Dropdown id="currency" title="Currency" defaultValue={transaction?.currency?.code || defaultCurrency}>
        {(Array.isArray(currencies) ? currencies : []).map((currency) => {
          const symbol = CURRENCY_SYMBOLS[currency.code]?.symbol;
          return (
            <Form.Dropdown.Item
              key={currency.code}
              value={currency.code}
              title={symbol ? `${currency.code} (${symbol})` : currency.code}
            />
          );
        })}
      </Form.Dropdown>

      <Form.DatePicker id="date" title="Date" type={Form.DatePicker.Type.Date} defaultValue={defaultDate} />

      <Form.Dropdown
        id="category"
        title="Category"
        defaultValue={transaction?.category}
        onChange={(newValue) => setSelectedCategory(newValue)}
      >
        {filteredCategories.map((category) => (
          <Form.Dropdown.Item key={category.id} value={category.id} title={category.name} />
        ))}
      </Form.Dropdown>

      <Form.TagPicker id="tags" title="Tags" defaultValue={transaction?.tags || []}>
        {filteredTags.map((tag) => (
          <Form.TagPicker.Item key={tag.id} value={tag.id} title={tag.name} />
        ))}
      </Form.TagPicker>

      <Form.Dropdown id="account" title="Account" defaultValue={transaction?.account || (accounts && accounts[0]?.id)}>
        {accounts?.map((account) => {
          const symbol = CURRENCY_SYMBOLS[account.currency.code]?.symbol || account.currency.code;
          return <Form.Dropdown.Item key={account.id} value={account.id} title={`${account.name} (${symbol})`} />;
        })}
      </Form.Dropdown>

      <Form.TextArea
        id="description"
        title="Description"
        placeholder="Lunch, Taxi, etc."
        defaultValue={transaction?.desc}
      />

      <Form.Separator />

      <Form.Checkbox id="isRecurring" label="Recurring Entry" defaultValue={!!transaction?.repeat} />

      <Form.Dropdown id="frequency" title="Frequency" defaultValue={transaction?.repeat?.frequency || "monthly"}>
        <Form.Dropdown.Item value="daily" title="Daily" />
        <Form.Dropdown.Item value="weekly" title="Weekly" />
        <Form.Dropdown.Item value="monthly" title="Monthly" />
        <Form.Dropdown.Item value="yearly" title="Yearly" />
      </Form.Dropdown>

      <Form.TextField
        id="interval"
        title="Every"
        placeholder="1"
        defaultValue={transaction?.repeat?.interval?.toString() || "1"}
        info="e.g. '2' for every 2 weeks"
      />

      <Form.Dropdown
        id="endType"
        title="End"
        defaultValue={transaction?.repeat?.end ? "date" : transaction?.repeat?.count ? "count" : "never"}
      >
        <Form.Dropdown.Item value="never" title="Never" />
        <Form.Dropdown.Item value="count" title="After X times" />
        <Form.Dropdown.Item value="date" title="On Date" />
      </Form.Dropdown>

      <Form.TextField
        id="count"
        title="Repeat Count"
        placeholder="10"
        defaultValue={transaction?.repeat?.count?.toString() || ""}
        info="Number of times to repeat"
      />

      <Form.DatePicker
        id="endDate"
        title="End Date"
        type={Form.DatePicker.Type.Date}
        defaultValue={transaction?.repeat?.end ? new Date(transaction.repeat.end) : undefined}
      />
    </Form>
  );
}
