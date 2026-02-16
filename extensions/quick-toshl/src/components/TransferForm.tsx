import { ActionPanel, Action, Form, useNavigation, showToast, Toast, Icon } from "@raycast/api";
import { useState } from "react";
import { useCachedPromise } from "@raycast/utils";
import { toshl } from "../utils/toshl";
import { TransferInput } from "../utils/types";
import { format } from "date-fns";
import { CURRENCY_SYMBOLS } from "../utils/helpers";

export function TransferForm() {
  const { pop } = useNavigation();
  const [isLoading, setIsLoading] = useState(false);

  // Fetch Accounts and Currencies
  const { data: accounts, isLoading: isLoadingAccounts } = useCachedPromise(() => toshl.getAccounts());
  const { data: currencies, isLoading: isLoadingCurrencies } = useCachedPromise(() => toshl.getCurrencies());

  // Get default currency from Toshl API (/me endpoint)
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

      const payload: TransferInput = {
        amount: -Math.abs(parseFloat(values.amount)), // Always negative for transfer out
        currency: { code: currencyCode },
        date: values.date ? format(values.date, "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd"),
        desc: values.description,
        account: values.fromAccount,
        transaction: {
          account: values.toAccount,
          currency: { code: currencyCode },
        },
      };

      await toshl.addTransfer(payload);
      showToast({ style: Toast.Style.Success, title: "Transfer Added" });
      pop();
    } catch {
      // Error handled in interceptor
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Form
      isLoading={isLoading || isLoadingAccounts || isLoadingCurrencies || isLoadingDefaultCurrency}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Add Transfer" onSubmit={handleSubmit} icon={Icon.Check} />
        </ActionPanel>
      }
    >
      <Form.TextField id="amount" title="Amount" placeholder="0.00" />

      <Form.Dropdown id="currency" title="Currency" defaultValue={defaultCurrency}>
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

      <Form.DatePicker id="date" title="Date" type={Form.DatePicker.Type.Date} defaultValue={new Date()} />

      <Form.Dropdown id="fromAccount" title="From Account">
        {accounts?.map((account) => {
          const symbol = CURRENCY_SYMBOLS[account.currency.code]?.symbol || account.currency.code;
          return <Form.Dropdown.Item key={account.id} value={account.id} title={`${account.name} (${symbol})`} />;
        })}
      </Form.Dropdown>

      <Form.Dropdown id="toAccount" title="To Account">
        {accounts?.map((account) => {
          const symbol = CURRENCY_SYMBOLS[account.currency.code]?.symbol || account.currency.code;
          return <Form.Dropdown.Item key={account.id} value={account.id} title={`${account.name} (${symbol})`} />;
        })}
      </Form.Dropdown>

      <Form.TextArea id="description" title="Description" placeholder="Transfer note..." />
    </Form>
  );
}
