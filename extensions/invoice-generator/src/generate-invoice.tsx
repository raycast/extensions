import { Action, ActionPanel, Form, LaunchProps } from "@raycast/api";
import { useForm, FormValidation } from "@raycast/utils";
import { Fragment, useState } from "react";

import { generateInvoice } from "./scripts";
import {
  currencies,
  defaultIncludeAddress,
  defaultIncludeTax,
  includeAmountPaid,
  includePaymentTerms,
  includeShipping,
  initialCustomFields,
  initialInvoiceFormValues,
  initialInvoiceItemValues,
  locales,
  termsAndConditions,
} from "./utils";
import { InvoiceFormValues, InvoiceFormItemValues, InvoiceFormCustomFieldValues } from "./types";

export default function GenerateInvoice(props: LaunchProps<{ draftValues: InvoiceFormValues }>) {
  const { draftValues } = props;
  const [includeAddress, setIncludeAddress] = useState<boolean>(defaultIncludeAddress);
  const [includeTax, setIncludeTax] = useState<boolean>(defaultIncludeTax);
  const [items, setItems] = useState<InvoiceFormItemValues>(initialInvoiceItemValues);
  const [customFields, setCustomFields] = useState<InvoiceFormCustomFieldValues>(initialCustomFields);

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
          <Action
            title="Add Custom Field"
            shortcut={{ modifiers: ["cmd", "shift"], key: "n" }}
            onAction={() => setCustomFields((prevFields) => [...prevFields, ...initialCustomFields])}
          />
          <Action
            title="Remove Custom Field"
            shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
            onAction={() => setCustomFields((prevFields) => prevFields.slice(0, prevFields.length - 1))}
          />
          <Action title="Reset Form" shortcut={{ modifiers: ["cmd"], key: "r" }} onAction={() => reset()} />
        </ActionPanel>
      }
    >
      <Form.TextField title="Invoice Number" {...itemProps.number} />
      <Form.DatePicker title="Date" {...itemProps.date} />
      <Form.TextField title="From" {...itemProps.from} />
      <Form.Checkbox id="includeAddress" label="Include Address" value={includeAddress} onChange={setIncludeAddress} />
      {includeAddress && <Form.TextArea title="Address" {...itemProps.address} />}
      <Form.TextArea title="To" {...itemProps.to} />

      <Form.Separator />
      <Form.Description text="Invoice Details" />

      <Form.Dropdown title="Currency" {...itemProps.currency}>
        {currencies.map((currency) => (
          <Form.Dropdown.Item key={currency.value} title={currency.title} value={currency.value} />
        ))}
      </Form.Dropdown>
      <Form.Checkbox id="includeTax" label="Include Tax" value={includeTax} onChange={setIncludeTax} />
      {includeTax && (
        <>
          <Form.Dropdown id="taxType" title="Tax Type">
            <Form.Dropdown.Item title="Percentage" value="%" />
            <Form.Dropdown.Item title="Fixed" value="fixed" />
          </Form.Dropdown>
          <Form.TextField title="Tax" {...itemProps.tax} />
        </>
      )}
      {includeShipping && (
        <>
          <Form.TextField title="Shipping" {...itemProps.shipping} />
          <Form.TextArea title="Shipping Address" {...itemProps.ship_to} />
        </>
      )}

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

      <Form.Separator />
      <Form.Description text="Additional Content" />

      {includePaymentTerms && <Form.TextField title="Payment Terms" {...itemProps.payment_terms} />}
      {includeAmountPaid && <Form.TextField title="Amount Paid" {...itemProps.amount_paid} />}
      <Form.TextArea title="Notes" {...itemProps.notes} />
      {termsAndConditions && <Form.TextField title="Terms" {...itemProps.terms} />}
      <Form.Dropdown title="Localisation" {...itemProps.locale}>
        {locales.map((locale) => (
          <Form.Dropdown.Item key={locale.value} title={locale.title} value={locale.value} />
        ))}
      </Form.Dropdown>

      <Form.Separator />
      <Form.Description text="Custom Fields" />

      {customFields.map((field, index) => (
        <Fragment key={`field-${index}`}>
          <Form.TextField
            id={`cf-name-${index}`}
            title={`Name ${index}`}
            value={field.name}
            onChange={(value) =>
              setCustomFields((prevFields) => prevFields.map((f, i) => (i === index ? { ...f, name: value } : f)))
            }
          />
          <Form.TextField
            id={`cf-value-${index}`}
            title={`Value ${index}`}
            value={field.value}
            onChange={(value) =>
              setCustomFields((prevFields) => prevFields.map((f, i) => (i === index ? { ...f, value: value } : f)))
            }
          />
        </Fragment>
      ))}
    </Form>
  );
}
