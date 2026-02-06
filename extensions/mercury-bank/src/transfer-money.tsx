import {
  Action,
  ActionPanel,
  Alert,
  confirmAlert,
  Form,
  Icon,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useState } from "react";
import { FeatureGuard } from "./components/FeatureGuard";
import { MercuryApi } from "./lib/api";
import { useAccounts } from "./lib/hooks/useAccounts";
import { formatCurrency, generateIdempotencyKey } from "./lib/utils";

export default function TransferMoney() {
  return (
    <FeatureGuard feature="payments">
      {(apiKey, accountName) => (
        <TransferForm apiKey={apiKey} accountName={accountName} />
      )}
    </FeatureGuard>
  );
}

function TransferForm({
  apiKey,
  accountName,
}: {
  apiKey: string;
  accountName: string;
}) {
  const { pop } = useNavigation();
  const { data: accounts } = useAccounts(apiKey);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const activeAccounts = (accounts ?? []).filter((a) => a.status === "active");

  async function handleSubmit(values: {
    fromAccountId: string;
    toAccountId: string;
    amount: string;
    memo: string;
  }) {
    const amount = parseFloat(values.amount);
    if (isNaN(amount) || amount <= 0) {
      await showToast({ style: Toast.Style.Failure, title: "Invalid amount" });
      return;
    }
    if (!values.fromAccountId || !values.toAccountId) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Please select both accounts",
      });
      return;
    }
    if (values.fromAccountId === values.toAccountId) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Cannot transfer to the same account",
      });
      return;
    }

    const from = activeAccounts.find((a) => a.id === values.fromAccountId);
    const to = activeAccounts.find((a) => a.id === values.toAccountId);

    if (
      !(await confirmAlert({
        title: "Confirm Transfer",
        message: `Transfer ${formatCurrency(amount)} from ${from?.nickname ?? from?.name} to ${to?.nickname ?? to?.name}?`,
        primaryAction: { title: "Transfer", style: Alert.ActionStyle.Default },
        dismissAction: { title: "Cancel" },
      }))
    ) {
      return;
    }

    setIsSubmitting(true);
    try {
      const api = new MercuryApi(apiKey);
      await api.createTransfer({
        fromAccountId: values.fromAccountId,
        toAccountId: values.toAccountId,
        amount,
        idempotencyKey: generateIdempotencyKey(),
        memo: values.memo || undefined,
      });
      await showToast({
        style: Toast.Style.Success,
        title: "Transfer initiated",
        message: formatCurrency(amount),
      });
      pop();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Transfer failed",
        message: String(error),
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Form
      isLoading={isSubmitting}
      navigationTitle={`Mercury - ${accountName} - Transfer`}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Transfer"
            icon={Icon.Switch}
            onSubmit={handleSubmit}
          />
        </ActionPanel>
      }
    >
      <Form.Dropdown id="fromAccountId" title="From">
        {activeAccounts.map((account) => (
          <Form.Dropdown.Item
            key={account.id}
            title={`${account.nickname ?? account.name} (${formatCurrency(account.availableBalance)})`}
            value={account.id}
          />
        ))}
      </Form.Dropdown>

      <Form.Dropdown id="toAccountId" title="To">
        {activeAccounts.map((account) => (
          <Form.Dropdown.Item
            key={account.id}
            title={`${account.nickname ?? account.name} (${formatCurrency(account.availableBalance)})`}
            value={account.id}
          />
        ))}
      </Form.Dropdown>

      <Form.TextField id="amount" title="Amount" placeholder="0.00" />
      <Form.TextField
        id="memo"
        title="Memo"
        placeholder="Transfer memo (optional)"
      />
    </Form>
  );
}