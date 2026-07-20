import React, { useState } from "react";
import {
  Action,
  ActionPanel,
  Clipboard,
  Form,
  Icon,
  LaunchProps,
  Toast,
  popToRoot,
  showHUD,
  showToast,
} from "@raycast/api";
import { createDraftInvoice, sendInvoice, isValidEmail } from "./paypal";
import { saveInvoice } from "./storage";

interface LineItem {
  id: string;
  name: string;
  description: string;
  quantity: string;
  price: string;
}

interface DraftValues {
  recipientName: string;
  recipientEmail: string;
  currency: string;
  dueDate: Date;
  note: string;
  taxPercent: string;
  taxName: string;
  allowTip: boolean;
  allowPartialPayment: boolean;
}

let itemIdCounter = 0;
function localDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function newItem(): LineItem {
  return {
    id: String(++itemIdCounter),
    name: "",
    description: "",
    quantity: "1",
    price: "",
  };
}

function calcSubtotal(items: LineItem[]): number {
  return items.reduce((sum, item) => {
    const qty = parseFloat(item.quantity) || 0;
    const price = parseFloat(item.price) || 0;
    return sum + qty * price;
  }, 0);
}

export default function CreateInvoiceCommand(
  props: LaunchProps<{ draftValues: DraftValues }>,
) {
  const { draftValues } = props;

  const [recipientName, setRecipientName] = useState(
    draftValues?.recipientName ?? "",
  );
  const [recipientEmail, setRecipientEmail] = useState(
    draftValues?.recipientEmail ?? "",
  );
  const [recipientNameError, setRecipientNameError] = useState<
    string | undefined
  >();
  const [recipientEmailError, setRecipientEmailError] = useState<
    string | undefined
  >();

  const [currency, setCurrency] = useState(draftValues?.currency ?? "USD");
  const [dueDate, setDueDate] = useState<Date | null>(
    draftValues?.dueDate ?? null,
  );
  const [note, setNote] = useState(draftValues?.note ?? "");

  const [taxPercent, setTaxPercent] = useState(draftValues?.taxPercent ?? "");
  const [taxName, setTaxName] = useState(draftValues?.taxName ?? "");
  const [taxPercentError, setTaxPercentError] = useState<string | undefined>();

  const [allowTip, setAllowTip] = useState(draftValues?.allowTip ?? false);
  const [allowPartialPayment, setAllowPartialPayment] = useState(
    draftValues?.allowPartialPayment ?? false,
  );

  const [items, setItems] = useState<LineItem[]>([newItem()]);
  const [itemErrors, setItemErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  function addItem() {
    setItems((prev) => [...prev, newItem()]);
  }

  function updateItem(
    id: string,
    field: keyof Omit<LineItem, "id">,
    value: string,
  ) {
    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, [field]: value } : i)),
    );
    if (field === "price") {
      setItemErrors((prev) => {
        const next = { ...prev };
        if (
          value &&
          (!/^\d+(\.\d+)?$/.test(value.trim()) || parseFloat(value) <= 0)
        ) {
          next[`${id}-price`] = "Unit price must be a positive number";
        } else {
          delete next[`${id}-price`];
        }
        return next;
      });
    } else if (field === "name") {
      setItemErrors((prev) => {
        const next = { ...prev };
        delete next[`${id}-name`];
        return next;
      });
    }
  }

  function validate(): boolean {
    let valid = true;

    if (!recipientName.trim()) {
      setRecipientNameError("Customer name is required");
      valid = false;
    } else {
      setRecipientNameError(undefined);
    }

    if (recipientEmail.trim() && !isValidEmail(recipientEmail.trim())) {
      setRecipientEmailError("Please enter a valid email address");
      valid = false;
    } else {
      setRecipientEmailError(undefined);
    }

    if (
      taxPercent &&
      !/^\d+(\.\d+)?\s*%?$/.test(taxPercent.replace(/%$/, "").trim())
    ) {
      setTaxPercentError("Tax rate must be a number (e.g. 10 or 10%)");
      valid = false;
    } else {
      setTaxPercentError(undefined);
    }

    const errors: Record<string, string> = {};
    for (const item of items) {
      if (!item.name.trim()) {
        errors[`${item.id}-name`] = "Item name required";
        valid = false;
      }
      if (
        !item.price ||
        !/^\d+(\.\d+)?$/.test(item.price.trim()) ||
        parseFloat(item.price) <= 0
      ) {
        errors[`${item.id}-price`] = "Unit price must be a positive number";
        valid = false;
      }
    }
    setItemErrors(errors);

    return valid;
  }

  async function handleCreateLink() {
    if (!validate()) return;
    setIsSubmitting(true);

    try {
      await showToast({
        style: Toast.Style.Animated,
        title: "Creating invoice…",
      });

      const subtotal = calcSubtotal(items);
      const taxAmount = taxPercent
        ? subtotal * (parseFloat(taxPercent) / 100)
        : 0;
      const total = subtotal + taxAmount;

      const { invoiceId, invoicerViewUrl } = await createDraftInvoice({
        recipientName,
        recipientEmail: recipientEmail.trim() || undefined,
        currency,
        note: note.trim() || undefined,
        dueDate: dueDate ? localDateStr(dueDate) : undefined,
        taxPercent: taxPercent ? parseFloat(taxPercent) : undefined,
        taxName: taxName.trim() || undefined,
        allowTip,
        allowPartialPayment,
        items,
      });

      await showToast({
        style: Toast.Style.Animated,
        title: "Generating shareable link…",
      });

      const hasValidEmail =
        recipientEmail.trim().length > 0 && isValidEmail(recipientEmail.trim());
      const payerViewUrl = await sendInvoice(invoiceId, hasValidEmail);

      await saveInvoice({
        invoiceId,
        recipientName,
        recipientEmail: recipientEmail.trim() || undefined,
        currency,
        total,
        createdAt: new Date().toISOString(),
        dueDate: dueDate ? localDateStr(dueDate) : undefined,
        status: hasValidEmail ? "SENT" : "UNPAID",
        payerViewUrl,
        invoicerViewUrl,
      });

      await Clipboard.copy(payerViewUrl);
      await showHUD(
        hasValidEmail
          ? `Invoice sent to ${recipientEmail} — link copied ✓`
          : "Invoice link copied to clipboard ✓",
      );
      popToRoot();
    } catch (err) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to create invoice",
        message: String(err),
      });
      setIsSubmitting(false);
    }
  }

  async function handleCreateDraftOnly() {
    if (!validate()) return;
    setIsSubmitting(true);

    try {
      await showToast({ style: Toast.Style.Animated, title: "Saving draft…" });

      const subtotal = calcSubtotal(items);
      const taxAmount = taxPercent
        ? subtotal * (parseFloat(taxPercent) / 100)
        : 0;
      const total = subtotal + taxAmount;

      const { invoiceId, invoicerViewUrl } = await createDraftInvoice({
        recipientName,
        recipientEmail: recipientEmail.trim() || undefined,
        currency,
        note: note.trim() || undefined,
        dueDate: dueDate ? localDateStr(dueDate) : undefined,
        taxPercent: taxPercent ? parseFloat(taxPercent) : undefined,
        taxName: taxName.trim() || undefined,
        allowTip,
        allowPartialPayment,
        items,
      });

      await saveInvoice({
        invoiceId,
        recipientName,
        recipientEmail: recipientEmail.trim() || undefined,
        currency,
        total,
        createdAt: new Date().toISOString(),
        dueDate: dueDate ? localDateStr(dueDate) : undefined,
        status: "DRAFT",
        invoicerViewUrl,
      });

      await showToast({
        style: Toast.Style.Success,
        title: "Draft saved",
        message: "Find it in My Invoices",
      });
      popToRoot();
    } catch (err) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to save draft",
        message: String(err),
      });
      setIsSubmitting(false);
    }
  }

  const subtotal = calcSubtotal(items);
  const taxAmount = taxPercent ? subtotal * (parseFloat(taxPercent) / 100) : 0;
  const total = subtotal + taxAmount;
  const fmt = (n: number) => `${currency} ${n.toFixed(2)}`;

  return (
    <Form
      isLoading={isSubmitting}
      enableDrafts
      actions={
        <ActionPanel>
          <Action
            title="Create Invoice Link"
            icon={Icon.Link}
            shortcut={{
              macOS: { modifiers: ["cmd"], key: "return" },
              Windows: { modifiers: ["ctrl"], key: "return" },
            }}
            onAction={handleCreateLink}
          />
          <Action
            title="Save as Draft"
            icon={Icon.Document}
            shortcut={{
              macOS: { modifiers: ["cmd"], key: "s" },
              Windows: { modifiers: ["ctrl"], key: "s" },
            }}
            onAction={handleCreateDraftOnly}
          />
          <Action
            title="Add Line Item"
            icon={Icon.Plus}
            shortcut={{
              macOS: { modifiers: ["cmd"], key: "n" },
              Windows: { modifiers: ["ctrl"], key: "n" },
            }}
            onAction={addItem}
          />
        </ActionPanel>
      }
    >
      <Form.Description title="Customer" text="Who are you billing?" />
      <Form.TextField
        id="recipientName"
        title="Name"
        placeholder="John Doe"
        value={recipientName}
        error={recipientNameError}
        onChange={setRecipientName}
        onBlur={() => {
          if (!recipientName.trim())
            setRecipientNameError("Customer name is required");
          else setRecipientNameError(undefined);
        }}
      />
      <Form.TextField
        id="recipientEmail"
        title="Email (optional)"
        placeholder="john@example.com"
        value={recipientEmail}
        error={recipientEmailError}
        onChange={(v) => {
          setRecipientEmail(v);
          if (recipientEmailError) setRecipientEmailError(undefined);
        }}
        onBlur={() => {
          if (recipientEmail.trim() && !isValidEmail(recipientEmail.trim())) {
            setRecipientEmailError("Please enter a valid email address");
          } else {
            setRecipientEmailError(undefined);
          }
        }}
      />

      <Form.Separator />

      <Form.Description
        title="Invoice Details"
        text="Set the currency, due date, and a note that will appear on the invoice for your customer."
      />
      <Form.Dropdown
        id="currency"
        title="Currency"
        value={currency}
        onChange={setCurrency}
      >
        <Form.Dropdown.Item value="USD" title="USD – US Dollar" />
        <Form.Dropdown.Item value="EUR" title="EUR – Euro" />
        <Form.Dropdown.Item value="GBP" title="GBP – British Pound" />
        <Form.Dropdown.Item value="CAD" title="CAD – Canadian Dollar" />
        <Form.Dropdown.Item value="AUD" title="AUD – Australian Dollar" />
        <Form.Dropdown.Item value="JPY" title="JPY – Japanese Yen" />
        <Form.Dropdown.Item value="SGD" title="SGD – Singapore Dollar" />
        <Form.Dropdown.Item value="HKD" title="HKD – Hong Kong Dollar" />
        <Form.Dropdown.Item value="VND" title="VND – Vietnamese Dong" />
      </Form.Dropdown>
      <Form.DatePicker
        id="dueDate"
        title="Due Date (optional)"
        value={dueDate}
        onChange={setDueDate}
        type={Form.DatePicker.Type.Date}
      />
      <Form.TextArea
        id="note"
        title="Note to Customer (optional)"
        placeholder="e.g. Payment due within 30 days."
        value={note}
        onChange={setNote}
      />

      <Form.Separator />

      <Form.Description
        title="Line Items"
        text="Press ⌘N (Mac) or Ctrl+N (Windows) to add another item."
      />
      {items.map((item, index) => (
        <React.Fragment key={item.id}>
          <Form.TextField
            id={`item-name-${item.id}`}
            title={`Item ${index + 1} — Name`}
            placeholder="e.g. Tour service, logo design"
            value={item.name}
            error={itemErrors[`${item.id}-name`]}
            onChange={(v) => updateItem(item.id, "name", v)}
          />
          <Form.TextArea
            id={`item-desc-${item.id}`}
            title="Description (optional)"
            placeholder="Additional details about this item"
            value={item.description}
            onChange={(v) => updateItem(item.id, "description", v)}
          />
          <Form.TextField
            id={`item-qty-${item.id}`}
            title="Quantity"
            placeholder="1"
            value={item.quantity}
            onChange={(v) => updateItem(item.id, "quantity", v)}
          />
          <Form.TextField
            id={`item-price-${item.id}`}
            title="Unit Price"
            placeholder="0.00"
            value={item.price}
            error={itemErrors[`${item.id}-price`]}
            onChange={(v) => updateItem(item.id, "price", v)}
          />
          {index < items.length - 1 && <Form.Separator />}
        </React.Fragment>
      ))}

      <Form.Separator />

      <Form.Description
        title="Tax"
        text="Apply a tax to the entire invoice. Leave blank for no tax."
      />
      <Form.TextField
        id="taxName"
        title="Tax Name"
        placeholder="e.g. VAT, GST, Sales Tax"
        value={taxName}
        onChange={setTaxName}
      />
      <Form.TextField
        id="taxPercent"
        title="Tax Rate (%)"
        placeholder="e.g. 10 for 10%"
        value={taxPercent}
        error={taxPercentError}
        onChange={(v) => {
          setTaxPercent(v);
          if (v && !/^\d+(\.\d+)?\s*%?$/.test(v.trim())) {
            setTaxPercentError("Tax rate must be a number (e.g. 10 or 10%)");
          } else {
            setTaxPercentError(undefined);
          }
        }}
      />

      <Form.Separator />

      <Form.Description
        title="Payment Options"
        text="Optional settings that appear on the PayPal invoice payment page."
      />
      <Form.Checkbox
        id="allowTip"
        title="Allow Tip"
        label="Let the customer add a tip"
        value={allowTip}
        onChange={setAllowTip}
      />
      <Form.Checkbox
        id="allowPartialPayment"
        title="Allow Partial Payment"
        label="Let the customer pay a partial amount"
        value={allowPartialPayment}
        onChange={setAllowPartialPayment}
      />

      <Form.Separator />

      <Form.Description
        title="Summary"
        text={[
          `Subtotal   ${fmt(subtotal)}`,
          taxPercent
            ? `${taxName || "Tax"} (${taxPercent.replace(/[\s%]/g, "")}%)   ${fmt(taxAmount)}`
            : "",
          `─────────────────`,
          `Total        ${fmt(total)}`,
        ]
          .filter(Boolean)
          .join("\n")}
      />
    </Form>
  );
}
