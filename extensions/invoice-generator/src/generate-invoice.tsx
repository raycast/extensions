import { Action, ActionPanel, Form, LaunchProps } from "@raycast/api";
import { useForm, FormValidation } from "@raycast/utils";
import { Fragment, useState } from "react";

import { includeShipping, initialInvoiceFormValues, initialInvoiceItemValues } from "./utils";
import { InvoiceFormValues, InvoiceFormItemValues } from "./types";
import { generateInvoice } from "./scripts";

export default function GenerateInvoice(props: LaunchProps<{ draftValues: InvoiceFormValues }>) {
  const { draftValues } = props;
  const [includeAddress, setIncludeAddress] = useState<boolean>(false);
  const [includeTax, setIncludeTax] = useState<boolean>(false);
  const [items, setItems] = useState<InvoiceFormItemValues>(initialInvoiceItemValues);

  const handleItemUpdate = (index: number, key: string, value: string) => {
    setItems((prevItems) => {
      const newItems = [...prevItems];
      newItems[index] = {
        ...newItems[index],
        [key]: value,
      };
      return newItems;
    });
  };

  const { itemProps, handleSubmit, reset } = useForm<InvoiceFormValues>({
    initialValues: {
      ...initialInvoiceFormValues,
      ...draftValues,
    },
    validation: {
      number: FormValidation.Required,
      from: FormValidation.Required,
      to: FormValidation.Required,
      date: FormValidation.Required,
      currency: FormValidation.Required,
      tax: includeTax ? FormValidation.Required : undefined,
    },
    onSubmit: async (values) => {
      await generateInvoice(values, includeAddress);
    },
  });

  return (
    <Form
      enableDrafts
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Generate Invoice" onSubmit={handleSubmit} />
          <Action
            title="Add Item"
            shortcut={{ modifiers: ["cmd"], key: "n" }}
            onAction={() => setItems((prevItems) => [...prevItems, ...initialInvoiceItemValues])}
          />
          <Action
            title="Remove Item"
            shortcut={{ modifiers: ["cmd"], key: "d" }}
            onAction={() => setItems((prevItems) => prevItems.slice(0, prevItems.length - 1))}
          />
          <Action title="Reset Form" shortcut={{ modifiers: ["cmd"], key: "r" }} onAction={() => reset()} />
        </ActionPanel>
      }
    >
      <Form.TextField title="Invoice Number" {...itemProps.number} />
      <Form.TextField title="From" {...itemProps.from} />
      <Form.Checkbox id="includeAddress" label="Include Address" value={includeAddress} onChange={setIncludeAddress} />
      {includeAddress && <Form.TextArea title="Address" {...itemProps.address} />}
      <Form.TextArea title="To" {...itemProps.to} />
      <Form.DatePicker title="Date" {...itemProps.date} />
      <Form.TextField title="Currency" {...itemProps.currency} />
      <Form.Checkbox id="includeTax" label="Include Tax" onChange={setIncludeTax} />
      {includeTax && (
        <>
          <Form.Dropdown id="taxType" title="Tax Type">
            <Form.Dropdown.Item title="Percentage" value="%" />
            <Form.Dropdown.Item title="Fixed" value="fixed" />
          </Form.Dropdown>
          <Form.TextField title="Tax" {...itemProps.tax} />
        </>
      )}
      {includeShipping && <Form.TextField title="Shipping" {...itemProps.shipping} />}
      <Form.TextField title="Amount Paid" {...itemProps.amount_paid} />
      <Form.TextArea title="Notes" {...itemProps.notes} />

      <Form.Separator />
      <Form.Description text="Items" />

      {items.map((item, index) => (
        <Fragment key={`item-${index}`}>
          <Form.TextField
            id={`name-${index}`}
            title={`Name ${index}`}
            value={item.name}
            onChange={(value) => handleItemUpdate(index, "name", value)}
          />
          <Form.TextField
            id={`quantity-${index}`}
            title={`Quantity ${index}`}
            value={item.quantity}
            onChange={(value) => handleItemUpdate(index, "quantity", value)}
          />
          <Form.TextField
            id={`unit_cost-${index}`}
            title={`Unit Cost ${index}`}
            value={item.unit_cost}
            onChange={(value) => handleItemUpdate(index, "unit_cost", value)}
          />
        </Fragment>
      ))}
    </Form>
  );
}
