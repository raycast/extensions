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
import { useRecipients } from "./lib/hooks/useRecipients";
import { formatCurrency, generateIdempotencyKey } from "./lib/utils";

export default function SendMoney() {
  return (
    <FeatureGuard feature="payments">
      {(apiKey, accountName) => (
        <SendMoneyForm apiKey={apiKey} accountName={accountName} />
      )}
    </FeatureGuard>
  );
}

function SendMoneyForm({
  apiKey,
  accountName,
}: {
  apiKey: string;
  accountName: string;
}) {
  const { pop } = useNavigation();
  const { data: accounts } = useAccounts(apiKey);
  const { data: recipients } = useRecipients(apiKey);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const activeAccounts = (accounts ?? []).filter((a) => a.status === "active");
  const activeRecipients = (recipients ?? []).filter(
    (r) => r.status === "active",
  );

  async function handleSubmit(values: {
    accountId: string;
    recipientId: string;
    amount: string;
    paymentMethod: string;
    memo: string;
  }) {
    const amount = parseFloat(values.amount);
    if (isNaN(amount) || amount <= 0) {
      await showToast({ style: Toast.Style.Failure, title: "Invalid amount" });
      return;
    }
    if (!values.recipientId || !values.accountId) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Please select an account and recipient",
      });
      return;
    }

    const recipient = activeRecipients.find((r) => r.id === values.recipientId);
    const account = activeAccounts.find((a) => a.id === values.accountId);

    if (
      !(await confirmAlert({
        title: "Confirm Payment",
        message: `Send ${formatCurrency(amount)} to ${recipient?.name ?? "recipient"} from ${account?.nickname ?? account?.name ?? "account"} via ${values.paymentMethod.toUpperCase()}?`,
        primaryAction: { title: "Send", style: Alert.ActionStyle.Default },
        dismissAction: { title: "Cancel" },
      }))
    ) {
      return;
    }

    setIsSubmitting(true);
    try {
      const api = new MercuryApi(apiKey);
      await api.sendPayment(values.accountId, {
        recipientId: values.recipientId,
        amount,
        paymentMethod: values.paymentMethod as
          | "ach"
          | "check"
          | "domesticWire"
          | "internationalWire",
        idempotencyKey: generateIdempotencyKey(),
        memo: values.memo || undefined,
      });
      await showToast({
        style: Toast.Style.Success,
        title: "Payment sent",
        message: `${formatCurrency(amount)} to ${recipient?.name}`,
      });
      pop();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Payment failed",
        message: String(error),
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Form
      isLoading={isSubmitting}
      navigationTitle={`Mercury - ${accountName} - Send Money`}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Send Payment"
            icon={Icon.ArrowRight}
            onSubmit={handleSubmit}
          />
        </ActionPanel>
      }
    >
      <Form.Dropdown id="accountId" title="From Account">
        {activeAccounts.map((account) => (
          <Form.Dropdown.Item
            key={account.id}
            title={`${account.nickname ?? account.name} (${formatCurrency(account.availableBalance)})`}
            value={account.id}
          />
        ))}
      </Form.Dropdown>

      <Form.Dropdown id="recipientId" title="To Recipient">
        {activeRecipients.map((recipient) => (
          <Form.Dropdown.Item
            key={recipient.id}
            title={recipient.nickname ?? recipient.name}
            value={recipient.id}
          />
        ))}
      </Form.Dropdown>

      <Form.TextField id="amount" title="Amount" placeholder="0.00" />

      <Form.Dropdown
        id="paymentMethod"
        title="Payment Method"
        defaultValue="ach"
      >
        <Form.Dropdown.Item title="ACH" value="ach" />
        <Form.Dropdown.Item title="Domestic Wire" value="domesticWire" />
        <Form.Dropdown.Item
          title="International Wire"
          value="internationalWire"
        />
        <Form.Dropdown.Item title="Check" value="check" />
      </Form.Dropdown>

      <Form.TextField
        id="memo"
        title="Memo"
        placeholder="Payment memo (optional)"
      />
    </Form>
  );
}