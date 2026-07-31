import { ActionPanel, Action, Form, useNavigation, showToast, Toast, Icon } from "@raycast/api";
import { useState } from "react";
import { useCachedPromise } from "@raycast/utils";
import { toshl } from "../utils/toshl";
import { TransferInput, Transaction } from "../utils/types";
import { format } from "date-fns";
import { CURRENCY_SYMBOLS } from "../utils/helpers";

export type TransferFormProps = {
  transaction?: Transaction;
  /** When editing a repeating transfer, maps to Toshl `update` query param. */
  recurringUpdateMode?: "one" | "tail" | "all";
  onSaved?: () => void;
};

export function TransferForm({ transaction, recurringUpdateMode, onSaved }: TransferFormProps) {
  const { pop } = useNavigation();
  const [isLoading, setIsLoading] = useState(false);
  const isEdit = !!transaction;

  const { data: accounts, isLoading: isLoadingAccounts } = useCachedPromise(() => toshl.getAccounts());
  const { data: currencies, isLoading: isLoadingCurrencies } = useCachedPromise(() => toshl.getCurrencies());
  const { data: defaultCurrency, isLoading: isLoadingDefaultCurrency } = useCachedPromise(() =>
    toshl.getDefaultCurrency(),
  );

  interface FormValues {
    amount: string;
    date: Date | null;
    description: string;
    fromAccount: string;
    toAccount: string;
    currency: string;
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
    if (!values.fromAccount || !values.toAccount) {
      showToast({ style: Toast.Style.Failure, title: "Validation Error", message: "Both accounts are required" });
      return;
    }
    if (values.fromAccount === values.toAccount) {
      showToast({
        style: Toast.Style.Failure,
        title: "Validation Error",
        message: "From and To accounts must be different",
      });
      return;
    }

    setIsLoading(true);
    try {
      const currencyCode = values.currency || defaultCurrency || "USD";
      const entryDate = values.date ? format(values.date, "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd");

      const toCurrencyCode = transaction?.transaction?.currency?.code || currencyCode;

      const payload: TransferInput = {
        amount: -Math.abs(parseFloat(values.amount)),
        currency: {
          code: currencyCode,
          rate: transaction?.currency.rate,
          fixed: transaction?.currency.fixed,
        },
        date: entryDate,
        desc: values.description,
        account: values.fromAccount,
        transaction: {
          id: transaction?.transaction?.id,
          account: values.toAccount,
          currency: {
            code: toCurrencyCode,
            rate: transaction?.transaction?.currency?.rate,
            fixed: transaction?.transaction?.currency?.fixed,
          },
        },
      };

      if (isEdit) {
        payload.modified = transaction!.modified;
        if (transaction!.repeat) payload.repeat = transaction!.repeat;
        await toshl.updateTransfer(transaction!.id, payload, recurringUpdateMode);
        showToast({ style: Toast.Style.Success, title: "Transfer Updated" });
      } else {
        await toshl.addTransfer(payload);
        showToast({ style: Toast.Style.Success, title: "Transfer Added" });
      }
      onSaved?.();
      pop();
    } catch {
      // Toast from axios interceptor
    } finally {
      setIsLoading(false);
    }
  }

  const defaultDate = transaction ? new Date(transaction.date) : new Date();
  const defaultFrom = transaction?.account || "";
  const defaultTo = transaction?.transaction?.account || "";
  const defaultAmount = transaction ? Math.abs(transaction.amount).toString() : "";
  const defaultCurrencyValue = transaction?.currency?.code || defaultCurrency;

  return (
    <Form
      isLoading={isLoading || isLoadingAccounts || isLoadingCurrencies || isLoadingDefaultCurrency}
      navigationTitle={isEdit ? "Edit Transfer" : "New Transfer"}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={isEdit ? "Update Transfer" : "Add Transfer"}
            onSubmit={handleSubmit}
            icon={Icon.Check}
          />
        </ActionPanel>
      }
    >
      <Form.TextField id="amount" title="Amount" placeholder="0.00" defaultValue={defaultAmount} />

      <Form.Dropdown id="currency" title="Currency" defaultValue={defaultCurrencyValue}>
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

      <Form.Dropdown id="fromAccount" title="From Account" defaultValue={defaultFrom || undefined}>
        {accounts?.map((account) => {
          const symbol = CURRENCY_SYMBOLS[account.currency.code]?.symbol || account.currency.code;
          return <Form.Dropdown.Item key={account.id} value={account.id} title={`${account.name} (${symbol})`} />;
        })}
      </Form.Dropdown>

      <Form.Dropdown id="toAccount" title="To Account" defaultValue={defaultTo || undefined}>
        {accounts?.map((account) => {
          const symbol = CURRENCY_SYMBOLS[account.currency.code]?.symbol || account.currency.code;
          return <Form.Dropdown.Item key={account.id} value={account.id} title={`${account.name} (${symbol})`} />;
        })}
      </Form.Dropdown>

      <Form.TextArea
        id="description"
        title="Description"
        placeholder="Transfer note..."
        defaultValue={transaction?.desc}
      />
    </Form>
  );
}
