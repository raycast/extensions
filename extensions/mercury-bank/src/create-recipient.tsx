import {
  Action,
  ActionPanel,
  Form,
  Icon,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useState } from "react";
import { FeatureGuard } from "./components/FeatureGuard";
import { MercuryApi } from "./lib/api";

export default function CreateRecipient() {
  return (
    <FeatureGuard feature="recipients">
      {(apiKey, accountName) => (
        <RecipientForm apiKey={apiKey} accountName={accountName} />
      )}
    </FeatureGuard>
  );
}

function RecipientForm({
  apiKey,
  accountName,
}: {
  apiKey: string;
  accountName: string;
}) {
  const { pop } = useNavigation();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("ach");

  async function handleSubmit(values: {
    name: string;
    email: string;
    paymentMethod: string;
    accountNumber: string;
    routingNumber: string;
    accountType: string;
  }) {
    if (!values.name?.trim()) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Name is required",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const api = new MercuryApi(apiKey);
      await api.createRecipient({
        name: values.name.trim(),
        emails: values.email ? [values.email.trim()] : [],
        defaultPaymentMethod: values.paymentMethod as
          | "ach"
          | "check"
          | "domesticWire"
          | "internationalWire",
        ...(values.paymentMethod === "ach" &&
        values.accountNumber &&
        values.routingNumber
          ? {
              electronicRoutingInfo: {
                accountNumber: values.accountNumber,
                routingNumber: values.routingNumber,
                electronicAccountType: values.accountType || "businessChecking",
              },
            }
          : {}),
        ...(values.paymentMethod === "domesticWire" &&
        values.accountNumber &&
        values.routingNumber
          ? {
              domesticWireRoutingInfo: {
                accountNumber: values.accountNumber,
                routingNumber: values.routingNumber,
              },
            }
          : {}),
      });
      await showToast({
        style: Toast.Style.Success,
        title: "Recipient created",
        message: values.name,
      });
      pop();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to create recipient",
        message: String(error),
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Form
      isLoading={isSubmitting}
      navigationTitle={`Mercury - ${accountName} - Create Recipient`}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Create Recipient"
            icon={Icon.Plus}
            onSubmit={handleSubmit}
          />
        </ActionPanel>
      }
    >
      <Form.TextField id="name" title="Name" placeholder="Recipient name" />
      <Form.TextField
        id="email"
        title="Email"
        placeholder="recipient@example.com (optional)"
      />
      <Form.Dropdown
        id="paymentMethod"
        title="Payment Method"
        value={paymentMethod}
        onChange={setPaymentMethod}
      >
        <Form.Dropdown.Item title="ACH" value="ach" />
        <Form.Dropdown.Item title="Domestic Wire" value="domesticWire" />
        <Form.Dropdown.Item
          title="International Wire"
          value="internationalWire"
        />
        <Form.Dropdown.Item title="Check" value="check" />
      </Form.Dropdown>

      {(paymentMethod === "ach" || paymentMethod === "domesticWire") && (
        <>
          <Form.Separator />
          <Form.TextField
            id="accountNumber"
            title="Account Number"
            placeholder="Bank account number"
          />
          <Form.TextField
            id="routingNumber"
            title="Routing Number"
            placeholder="Routing number"
          />
        </>
      )}

      {paymentMethod === "ach" && (
        <Form.Dropdown
          id="accountType"
          title="Account Type"
          defaultValue="businessChecking"
        >
          <Form.Dropdown.Item
            title="Business Checking"
            value="businessChecking"
          />
          <Form.Dropdown.Item
            title="Business Savings"
            value="businessSavings"
          />
          <Form.Dropdown.Item
            title="Personal Checking"
            value="personalChecking"
          />
          <Form.Dropdown.Item
            title="Personal Savings"
            value="personalSavings"
          />
        </Form.Dropdown>
      )}
    </Form>
  );
}