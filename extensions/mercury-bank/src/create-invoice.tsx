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
import { useCustomers } from "./lib/hooks/useCustomers";
import { useAccounts } from "./lib/hooks/useAccounts";

export default function CreateInvoice() {
  return (
    <FeatureGuard feature="invoices">
      {(apiKey, accountName) => (
        <InvoiceForm apiKey={apiKey} accountName={accountName} />
      )}
    </FeatureGuard>
  );
}

function InvoiceForm({
  apiKey,
  accountName,
}: {
  apiKey: string;
  accountName: string;
}) {
  const { pop } = useNavigation();
  const { data: customers } = useCustomers(apiKey);
  const { data: accounts } = useAccounts(apiKey);
  const activeAccounts = (accounts ?? []).filter((a) => a.status === "active");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(values: {
    customerId: string;
    destinationAccountId: string;
    dueDate: Date | null;
    invoiceNumber: string;
    payerMemo: string;
    item1Name: string;
    item1Quantity: string;
    item1UnitPrice: string;
    item2Name: string;
    item2Quantity: string;
    item2UnitPrice: string;
    item3Name: string;
    item3Quantity: string;
    item3UnitPrice: string;
  }) {
    if (!values.customerId) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Please select a customer",
      });
      return;
    }
    if (!values.destinationAccountId) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Please select a destination account",
      });
      return;
    }
    if (!values.dueDate) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Please set a due date",
      });
      return;
    }

    const today = new Date().toISOString().split("T")[0];
    const lineItems = [
      {
        name: values.item1Name,
        quantity: values.item1Quantity,
        unitPrice: values.item1UnitPrice,
      },
      {
        name: values.item2Name,
        quantity: values.item2Quantity,
        unitPrice: values.item2UnitPrice,
      },
      {
        name: values.item3Name,
        quantity: values.item3Quantity,
        unitPrice: values.item3UnitPrice,
      },
    ]
      .filter((item) => item.name && item.unitPrice)
      .map((item) => ({
        name: item.name,
        quantity: parseFloat(item.quantity) || 1,
        unitPrice: parseFloat(item.unitPrice),
      }));

    if (lineItems.length === 0) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Add at least one line item",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const api = new MercuryApi(apiKey);
      await api.createInvoice({
        customerId: values.customerId,
        destinationAccountId: values.destinationAccountId,
        dueDate: values.dueDate.toISOString().split("T")[0],
        invoiceDate: today,
        lineItems,
        creditCardEnabled: true,
        achDebitEnabled: true,
        useRealAccountNumber: false,
        ccEmails: [],
        payerMemo: values.payerMemo || undefined,
        invoiceNumber: values.invoiceNumber || undefined,
      });
      await showToast({ style: Toast.Style.Success, title: "Invoice created" });
      pop();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to create invoice",
        message: String(error),
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Form
      isLoading={isSubmitting}
      navigationTitle={`Mercury - ${accountName} - Create Invoice`}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Create Invoice"
            icon={Icon.Plus}
            onSubmit={handleSubmit}
          />
        </ActionPanel>
      }
    >
      <Form.Dropdown id="customerId" title="Customer">
        {(customers ?? []).map((customer) => (
          <Form.Dropdown.Item
            key={customer.id}
            title={customer.name}
            value={customer.id}
          />
        ))}
      </Form.Dropdown>

      <Form.Dropdown id="destinationAccountId" title="Destination Account">
        {activeAccounts.map((account) => (
          <Form.Dropdown.Item
            key={account.id}
            title={account.nickname ?? account.name}
            value={account.id}
          />
        ))}
      </Form.Dropdown>

      <Form.DatePicker
        id="dueDate"
        title="Due Date"
        type={Form.DatePicker.Type.Date}
      />
      <Form.TextField
        id="invoiceNumber"
        title="Invoice Number"
        placeholder="Auto-generated if empty"
      />
      <Form.TextArea
        id="payerMemo"
        title="Memo"
        placeholder="Customer-visible memo (optional)"
      />

      <Form.Separator />
      <Form.Description text="Line Item 1" />
      <Form.TextField
        id="item1Name"
        title="Name"
        placeholder="Service or product"
      />
      <Form.TextField
        id="item1Quantity"
        title="Quantity"
        placeholder="1"
        defaultValue="1"
      />
      <Form.TextField
        id="item1UnitPrice"
        title="Unit Price"
        placeholder="0.00"
      />

      <Form.Separator />
      <Form.Description text="Line Item 2 (optional)" />
      <Form.TextField
        id="item2Name"
        title="Name"
        placeholder="Service or product"
      />
      <Form.TextField
        id="item2Quantity"
        title="Quantity"
        placeholder="1"
        defaultValue="1"
      />
      <Form.TextField
        id="item2UnitPrice"
        title="Unit Price"
        placeholder="0.00"
      />

      <Form.Separator />
      <Form.Description text="Line Item 3 (optional)" />
      <Form.TextField
        id="item3Name"
        title="Name"
        placeholder="Service or product"
      />
      <Form.TextField
        id="item3Quantity"
        title="Quantity"
        placeholder="1"
        defaultValue="1"
      />
      <Form.TextField
        id="item3UnitPrice"
        title="Unit Price"
        placeholder="0.00"
      />
    </Form>
  );
}