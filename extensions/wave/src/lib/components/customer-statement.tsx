import { useState } from "react";
import { Customer, Edges, Invoice, Result, InvoiceStatus } from "../types";
import { FormValidation, useFetch, useForm } from "@raycast/utils";
import { Action, ActionPanel, Detail, Form, Icon, List, useNavigation } from "@raycast/api";
import { API_URL } from "../config";
import { queryGetCustomerOutstandingInvoicesCustomerStatement } from "../gql/queries";
import { formatDate, formatMoney } from "../utils";
import { common } from "../wave";

export default function CustomerStatement({
  businessId,
  customers,
  initialCustomerId,
}: {
  businessId: string;
  customers: Customer[];
  initialCustomerId: string;
}) {
  const [execute, setExecute] = useState(false);

  type FormValues = {
    customerId: string;
    type: string;
    from: Date | null;
    to: Date | null;
  };
  const { itemProps, handleSubmit, values } = useForm<FormValues>({
    onSubmit() {
      setExecute(true);
    },
    initialValues: {
      customerId: initialCustomerId,
    },
    validation: {
      customerId: FormValidation.Required,
      type: FormValidation.Required,
      from(value) {
        if (values.type === "account-activity" && !value) return "The item is required";
      },
      to(value) {
        if (values.type === "account-activity" && !value) return "The item is required";
      },
    },
  });

  const { push } = useNavigation();
  const { isLoading } = useFetch(API_URL, {
    ...common(),
    body: JSON.stringify({
      query: values.type === "outstanding-invoices" ? queryGetCustomerOutstandingInvoicesCustomerStatement : "",
      variables: {
        businessId,
        customerId: values.customerId,
      },
    }),
    execute,
    onError() {
      setExecute(false);
    },
    mapResult(result: Result<{ business: { invoices: Edges<Invoice> } }>) {
      if ("errors" in result) throw new Error(result.errors[0].message);
      return {
        data: result.data.business.invoices.edges
          .filter(
            (edge) => ![InvoiceStatus.PAID, InvoiceStatus.DRAFT, InvoiceStatus.OVERPAID].includes(edge.node.status),
          )
          .map((edge) => edge.node),
      };
    },
    onData(data) {
      setExecute(false);
      push(<OutstandingInvoicesCustomerStatement invoices={data} />);
    },
  });

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm icon={Icon.Paragraph} title="Create Statement" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description text="Customer Statement" />
      <Form.Dropdown title="Customer" {...itemProps.customerId}>
        {customers.map((customer) => (
          <Form.Dropdown.Item key={customer.id} title={customer.name} value={customer.id} />
        ))}
      </Form.Dropdown>
      <Form.Dropdown title="Type" {...itemProps.type}>
        <Form.Dropdown.Item title="Outstanding invoices" value="outstanding-invoices" />
        {/* <Form.Dropdown.Item title="Account activity" value="account-activity" /> */}
      </Form.Dropdown>
      {values.type === "account-activity" && (
        <>
          <Form.DatePicker title="From" type={Form.DatePicker.Type.Date} max={new Date()} {...itemProps.from} />
          <Form.DatePicker title="To" type={Form.DatePicker.Type.Date} {...itemProps.to} />
        </>
      )}
    </Form>
  );
}

function OutstandingInvoicesCustomerStatement({ invoices }: { invoices: Invoice[] }) {
  if (!invoices.length)
    return (
      <List>
        <List.EmptyView
          icon="empty-folder.png"
          title="No outstanding invoices"
          description="Select a different customer"
        />
      </List>
    );
  const markdown = `
  | Invoice # | Invoice date | Due date | Total | Paid | Due |
  |-----------|--------------|----------|-------|------|-----|
  ${invoices.map((invoice) => `| ${invoice.invoiceNumber} | ${formatDate(invoice.invoiceDate)} | ${formatDate(invoice.dueDate)} | ${invoice.total.currency.symbol}${invoice.total.value} | ${formatMoney(invoice.amountPaid)} | ${formatMoney(invoice.amountDue)} |`).join(`\n`)}
  `;
  return <Detail markdown={markdown} />;
}
