import {
  Action,
  ActionPanel,
  Detail,
  Form,
  getPreferenceValues,
  Icon,
  open,
  showInFinder,
  showToast,
  Toast,
  Clipboard,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import { calculateInvoiceTotals, calculateLineTotal } from "./lib/calculations";
import { formatCurrency, formatInvoiceNumber, buildInvoiceSummary, getCurrencySymbol } from "./lib/formatters";
import { generateInvoicePDF } from "./lib/pdf-generator";
import { addClient, addInvoice, getClients, getNextInvoiceNumber } from "./lib/storage";
import { Client, Invoice, InvoiceLineItem } from "./lib/types";

const NEW_CLIENT_ID = "__new__";

export default function CreateInvoice() {
  const preferences = getPreferenceValues<Preferences>();
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [lineItemCount, setLineItemCount] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [successInvoice, setSuccessInvoice] = useState<Invoice | null>(null);
  const [lineItemValues, setLineItemValues] = useState<Record<string, string>>({});
  const [vatChecked, setVatChecked] = useState(preferences.vatRegistered);

  const paymentDays = parseInt(preferences.paymentTermsDays) || 30;

  const initialToday = new Date();
  initialToday.setHours(0, 0, 0, 0);
  const initialDue = new Date(initialToday);
  initialDue.setDate(initialDue.getDate() + paymentDays);
  const [invoiceDate, setInvoiceDate] = useState<Date | null>(initialToday);
  const [dueDate, setDueDate] = useState<Date | null>(initialDue);

  function handleInvoiceDateChange(newDate: Date | null) {
    setInvoiceDate(newDate);
    if (newDate) {
      const newDue = new Date(newDate);
      newDue.setHours(0, 0, 0, 0);
      newDue.setDate(newDue.getDate() + paymentDays);
      setDueDate(newDue);
    }
  }
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});

  function setError(field: string, message: string | undefined) {
    setErrors((prev) => ({ ...prev, [field]: message }));
  }

  function clearError(field: string) {
    setErrors((prev) => {
      if (!prev[field]) return prev;
      return { ...prev, [field]: undefined };
    });
  }

  function validateRequired(field: string, value: string | undefined, label: string): boolean {
    if (!(value || "").trim()) {
      setError(field, `${label} is required`);
      return false;
    }
    clearError(field);
    return true;
  }

  function validateNumber(field: string, value: string | undefined, label: string, allowZero = true): boolean {
    const trimmed = (value || "").trim();
    if (!trimmed) {
      setError(field, `${label} is required`);
      return false;
    }
    const num = parseFloat(trimmed);
    if (isNaN(num) || num < 0 || (!allowZero && num === 0)) {
      setError(field, `Enter a valid ${label.toLowerCase()}`);
      return false;
    }
    clearError(field);
    return true;
  }

  function updateLineItemValue(key: string, value: string) {
    setLineItemValues((prev) => ({ ...prev, [key]: value }));
  }

  const runningTotal = (() => {
    const vatRate = parseFloat(preferences.vatRate) || 0;
    const items = Array.from({ length: lineItemCount }, (_, i) => {
      const qty = parseFloat(lineItemValues[`qty_${i}`] || "1") || 0;
      const rate = parseFloat(lineItemValues[`rate_${i}`] || "0") || 0;
      return {
        description: "",
        quantity: qty,
        rate,
        lineTotal: calculateLineTotal(qty, rate),
      };
    });
    return calculateInvoiceTotals(items, vatChecked, vatRate);
  })();

  useEffect(() => {
    getClients()
      .then((data) => {
        setClients(data);
        setIsLoading(false);
      })
      .catch((err) => {
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to load clients",
          message: String(err),
        });
        setIsLoading(false);
      });
  }, []);

  if (successInvoice) {
    return (
      <Detail
        markdown={`# Invoice Created\n\n${buildInvoiceSummary(successInvoice)}\n\n**PDF saved to:** \`${successInvoice.pdfPath}\``}
        actions={
          <ActionPanel>
            <Action title="Open PDF" icon={Icon.Document} onAction={() => open(successInvoice.pdfPath)} />
            <Action title="Open in Finder" icon={Icon.Finder} onAction={() => showInFinder(successInvoice.pdfPath)} />
            <Action
              title="Copy File Path"
              icon={Icon.Clipboard}
              shortcut={{ modifiers: ["cmd"], key: "c" }}
              onAction={async () => {
                await Clipboard.copy(successInvoice.pdfPath);
                await showToast({
                  style: Toast.Style.Success,
                  title: "Path copied",
                });
              }}
            />
            <Action
              title="Copy Invoice Summary"
              icon={Icon.Text}
              shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
              onAction={async () => {
                await Clipboard.copy(buildInvoiceSummary(successInvoice));
                await showToast({
                  style: Toast.Style.Success,
                  title: "Summary copied",
                });
              }}
            />
          </ActionPanel>
        }
      />
    );
  }

  async function handleSubmit(values: Record<string, string | boolean | Date>) {
    // Validate all fields
    let hasErrors = false;
    const newErrors: Record<string, string | undefined> = {};

    const clientId = values.clientId as string;
    let client: Client;

    if (clientId === NEW_CLIENT_ID) {
      const newName = ((values.newClientName as string) || "").trim();
      const newContactName = ((values.newClientContactName as string) || "").trim();
      const newEmail = ((values.newClientEmail as string) || "").trim();
      const newAddress = ((values.newClientAddress as string) || "").trim();

      if (!newName) {
        newErrors.newClientName = "Client name is required";
        hasErrors = true;
      }
      if (!newEmail) {
        newErrors.newClientEmail = "Email is required";
        hasErrors = true;
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
        newErrors.newClientEmail = "Enter a valid email address";
        hasErrors = true;
      }

      if (hasErrors) {
        setErrors((prev) => ({ ...prev, ...newErrors }));
        await showToast({
          style: Toast.Style.Failure,
          title: "Please fix the errors above",
        });
        return;
      }

      const now = new Date().toISOString();
      client = {
        id: uuidv4(),
        name: newName,
        contactName: newContactName || undefined,
        email: newEmail,
        address: newAddress,
        createdAt: now,
        updatedAt: now,
      };
    } else {
      const found = clients.find((c) => c.id === clientId);
      if (!found) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Please select a client",
        });
        return;
      }
      client = found;
    }

    // Validate and parse line items
    const lineItems: InvoiceLineItem[] = [];
    for (let i = 0; i < lineItemCount; i++) {
      const desc = ((values[`desc_${i}`] as string) || "").trim();
      const qtyStr = ((values[`qty_${i}`] as string) || "").trim();
      const rateStr = ((values[`rate_${i}`] as string) || "").trim();

      if (!desc) {
        newErrors[`desc_${i}`] = "Description is required";
        hasErrors = true;
      }
      const qty = parseFloat(qtyStr || "1");
      const rate = parseFloat(rateStr);
      if (isNaN(qty) || qty < 0) {
        newErrors[`qty_${i}`] = "Enter a valid quantity";
        hasErrors = true;
      }
      if (!rateStr || isNaN(rate)) {
        newErrors[`rate_${i}`] = "Enter a valid rate";
        hasErrors = true;
      }

      if (!hasErrors) {
        lineItems.push({
          description: desc,
          quantity: qty,
          rate,
          lineTotal: calculateLineTotal(qty, rate),
        });
      }
    }

    // Dates
    const invoiceDateVal = values.invoiceDate as Date;
    const dueDateVal = values.dueDate as Date;

    if (!invoiceDateVal) {
      newErrors.invoiceDate = "Invoice date is required";
      hasErrors = true;
    }
    if (!dueDateVal) {
      newErrors.dueDate = "Due date is required";
      hasErrors = true;
    }

    if (hasErrors) {
      setErrors((prev) => ({ ...prev, ...newErrors }));
      await showToast({
        style: Toast.Style.Failure,
        title: "Please fix the errors above",
      });
      return;
    }

    const invoiceDate = invoiceDateVal;
    const dueDate = dueDateVal;

    // Calculate totals
    const vatApplied = values.vatApplied as boolean;
    const vatRate = parseFloat(preferences.vatRate) || 0;
    const { subtotal, vatAmount, total } = calculateInvoiceTotals(lineItems, vatApplied, vatRate);

    // Generate invoice
    try {
      const startingNum = parseInt(preferences.startingInvoiceNumber) || 1;
      const numberRaw = await getNextInvoiceNumber(startingNum);
      const invoiceNumber = formatInvoiceNumber(preferences.invoicePrefix, numberRaw);

      const now = new Date().toISOString();
      const invoice: Invoice = {
        id: uuidv4(),
        invoiceNumber,
        numberRaw,
        clientId: client.id,
        clientName: client.name,
        clientContactName: client.contactName,
        clientEmail: client.email,
        clientAddress: client.address,
        invoiceDate: invoiceDate.toISOString().split("T")[0],
        dueDate: dueDate.toISOString().split("T")[0],
        lineItems,
        subtotal,
        vatApplied,
        vatRate: vatApplied ? vatRate : 0,
        vatAmount,
        total,
        notes: ((values.notes as string) || "").trim(),
        status: "draft",
        pdfPath: "",
        createdAt: now,
        updatedAt: now,
      };

      // Generate PDF
      const pdfPath = await generateInvoicePDF(invoice, preferences);
      invoice.pdfPath = pdfPath;

      // Save new client if needed
      if (clientId === NEW_CLIENT_ID) {
        await addClient(client);
      }

      // Save invoice
      await addInvoice(invoice);

      await showToast({
        style: Toast.Style.Success,
        title: `Invoice ${invoiceNumber} created`,
      });
      setSuccessInvoice(invoice);
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to create invoice",
        message: String(error),
      });
    }
  }

  return (
    <Form
      isLoading={isLoading}
      navigationTitle="Create Invoice"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Invoice" icon={Icon.Document} onSubmit={handleSubmit} />
          <Action
            title="Add Line Item"
            icon={Icon.Plus}
            shortcut={{ modifiers: ["cmd"], key: "l" }}
            onAction={() => setLineItemCount((c) => c + 1)}
          />
          {lineItemCount > 1 && (
            <Action
              title="Remove Last Line Item"
              icon={Icon.Minus}
              shortcut={{ modifiers: ["cmd", "shift"], key: "l" }}
              onAction={() => setLineItemCount((c) => Math.max(1, c - 1))}
            />
          )}
        </ActionPanel>
      }
    >
      <Form.Dropdown id="clientId" title="Client" value={selectedClientId} onChange={setSelectedClientId}>
        <Form.Dropdown.Item value="" title="Select a client..." />
        <Form.Dropdown.Item value={NEW_CLIENT_ID} title="Add new" icon={Icon.Plus} />
        {clients.map((c) => (
          <Form.Dropdown.Item key={c.id} value={c.id} title={c.name} />
        ))}
      </Form.Dropdown>

      {selectedClientId === NEW_CLIENT_ID && (
        <>
          <Form.TextField
            id="newClientName"
            title="Company Name"
            placeholder="Company or trading name"
            error={errors.newClientName}
            onChange={() => clearError("newClientName")}
            onBlur={(e) => validateRequired("newClientName", e.target.value as string, "Company name")}
          />
          <Form.TextField id="newClientContactName" title="Contact Name" placeholder="First name or full name" />
          <Form.TextField
            id="newClientEmail"
            title="Email"
            placeholder="client@example.com"
            error={errors.newClientEmail}
            onChange={() => clearError("newClientEmail")}
          />
          <Form.TextArea id="newClientAddress" title="Address" placeholder="Street, City, Postcode" />
        </>
      )}

      <Form.Separator />

      <Form.DatePicker
        id="invoiceDate"
        title="Invoice Date"
        type={Form.DatePicker.Type.Date}
        value={invoiceDate}
        onChange={handleInvoiceDateChange}
        error={errors.invoiceDate}
      />
      <Form.DatePicker
        id="dueDate"
        title="Due Date"
        type={Form.DatePicker.Type.Date}
        value={dueDate}
        onChange={setDueDate}
        error={errors.dueDate}
      />

      <Form.Separator />

      {Array.from({ length: lineItemCount }, (_, i) => [
        <Form.Description key={`header_${i}`} title="" text={`- Line Item ${i + 1} -`} />,
        <Form.TextArea
          key={`desc_${i}`}
          id={`desc_${i}`}
          title={`Description ${i + 1}`}
          placeholder="Service description"
          error={errors[`desc_${i}`]}
          onChange={() => clearError(`desc_${i}`)}
          onBlur={(e) => validateRequired(`desc_${i}`, e.target.value as string, "Description")}
        />,
        <Form.TextField
          key={`qty_${i}`}
          id={`qty_${i}`}
          title={`Quantity ${i + 1}`}
          placeholder="1"
          defaultValue="1"
          error={errors[`qty_${i}`]}
          onChange={(v) => {
            clearError(`qty_${i}`);
            updateLineItemValue(`qty_${i}`, v);
          }}
          onBlur={(e) => validateNumber(`qty_${i}`, e.target.value as string, "Quantity")}
        />,
        <Form.TextField
          key={`rate_${i}`}
          id={`rate_${i}`}
          title={`Rate (${getCurrencySymbol()}) ${i + 1}`}
          placeholder="0.00"
          error={errors[`rate_${i}`]}
          onChange={(v) => {
            clearError(`rate_${i}`);
            updateLineItemValue(`rate_${i}`, v);
          }}
          onBlur={(e) => validateNumber(`rate_${i}`, e.target.value as string, "Rate", false)}
        />,
      ]).flat()}

      <Form.Description title="" text="⌘L to add a line  ·  ⌘⇧L to remove" />

      <Form.Separator />

      <Form.Checkbox
        id="vatApplied"
        label="Apply VAT"
        title="VAT"
        defaultValue={preferences.vatRegistered}
        onChange={setVatChecked}
      />

      {runningTotal.subtotal > 0 && (
        <Form.Description
          title="Total"
          text={`Subtotal: ${formatCurrency(runningTotal.subtotal)}${vatChecked ? `  |  VAT (${preferences.vatRate}%): ${formatCurrency(runningTotal.vatAmount)}` : ""}  |  Total: ${formatCurrency(runningTotal.total)}`}
        />
      )}

      <Form.TextArea id="notes" title="Notes" placeholder="Optional notes..." />
    </Form>
  );
}
