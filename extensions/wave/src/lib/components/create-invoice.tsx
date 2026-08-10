import { Action, ActionPanel, Form, Icon, useNavigation } from "@raycast/api";
import { FormValidation, showFailureToast, useForm } from "@raycast/utils";
import { common, useGetBusinessCustomers, useGetBusinessProductsAndServices } from "../wave";
import { API_URL } from "../config";
import { Result } from "../types";
import { MUTATIONS } from "../gql/mutations";
import { useState } from "react";

export default function CreateInvoice({ businessId, onCreate }: { businessId: string; onCreate: () => void }) {
  const { pop } = useNavigation();
  const [isCreating, setIsCreating] = useState(false);
  const { isLoading: isLoadingCustomers, data: customers } = useGetBusinessCustomers(businessId);
  const { isLoading: isLoadingProducts, data: products } = useGetBusinessProductsAndServices(businessId);

  type FormValues = {
    customerId: string;
    title: string;
    subhead: string;
    invoiceNumber: string;
    poNumber: string;
    invoiceDate: Date | null;
    dueDate: Date | null;
    items: string[];
    memo: string;
    footer: string;
  };
  const { handleSubmit, itemProps } = useForm<FormValues>({
    async onSubmit(values) {
      try {
        setIsCreating(true);
        const response = await fetch(API_URL, {
          ...common(),
          body: JSON.stringify({
            query: MUTATIONS.createInvoice,
            variables: {
              input: {
                businessId,
                status: "DRAFT",
                customerId: values.customerId,
                title: values.title || undefined,
                subhead: values.subhead || undefined,
                invoiceNumber: values.invoiceNumber || undefined,
                poNumber: values.poNumber || undefined,
                invoiceDate: values.invoiceDate?.toISOString().split("T")[0],
                dueDate: values.dueDate?.toISOString().split("T")[0],
                items: values.items.map((item) => ({ productId: item })),
                memo: values.memo || undefined,
                footer: values.footer || undefined,
              },
            },
          }),
        });
        const result = (await response.json()) as Result<{ invoiceCreate: { didSucceed: boolean } }>;
        if ("errors" in result) throw new Error(result.errors[0].message);
        if (!result.data.invoiceCreate.didSucceed) throw new Error("Unknown Error");
        onCreate();
        pop();
      } catch (error) {
        await showFailureToast(error);
      } finally {
        setIsCreating(false);
      }
    },
    validation: {
      customerId: FormValidation.Required,
      items: FormValidation.Required,
    },
  });

  const isLoading = isLoadingCustomers || isLoadingProducts || isCreating;
  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm icon={Icon.SaveDocument} title="Save" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description text="Business address and contact details, title, summary, and logo" />
      <Form.TextField title="" placeholder="Invoice Title" {...itemProps.title} />
      <Form.TextField
        title=""
        placeholder="Summary (e.g. project name, description of invoice)"
        {...itemProps.subhead}
      />
      <Form.Separator />

      <Form.Dropdown title="Customer" {...itemProps.customerId}>
        {customers.map((customer) => (
          <Form.Dropdown.Item key={customer.id} icon={Icon.Person} title={customer.name} value={customer.id} />
        ))}
      </Form.Dropdown>
      <Form.TextField
        title="Invoice number"
        info="Unique number assigned to the invoice. If not provided, will find the current largest invoice number and add 1."
        {...itemProps.invoiceNumber}
      />
      <Form.TextField title="P.O./S.O. number" {...itemProps.poNumber} />
      <Form.DatePicker title="Invoice date" type={Form.DatePicker.Type.Date} {...itemProps.invoiceDate} />
      <Form.DatePicker title="Payment due" type={Form.DatePicker.Type.Date} {...itemProps.dueDate} />
      <Form.Separator />

      <Form.TagPicker title="Items" placeholder="Add an item" {...itemProps.items}>
        {products.map((product) => (
          <Form.TagPicker.Item key={product.id} icon={Icon.Box} title={product.name} value={product.id} />
        ))}
      </Form.TagPicker>
      <Form.Separator />

      <Form.TextArea
        title="Notes / Terms"
        placeholder="Enter notes or terms of service that are visible to your customer"
        {...itemProps.memo}
      />
      <Form.Separator />
      <Form.TextArea
        title="Footer"
        placeholder="Enter a footer for this invoice (e.g. tax information, thank you note)"
        {...itemProps.footer}
      />
    </Form>
  );
}
