import React, { useEffect, useState } from "react";
import {
  Action,
  ActionPanel,
  Alert,
  Clipboard,
  Color,
  Form,
  Icon,
  List,
  Toast,
  confirmAlert,
  open,
  showHUD,
  showToast,
  useNavigation,
} from "@raycast/api";
import {
  InvoiceRecord,
  ListPreferences,
  deleteInvoice,
  loadInvoices,
  loadListPreferences,
  loadAllInvoiceDetails,
  saveAllInvoiceDetails,
  deleteInvoiceDetail,
  saveListPreferences,
  updateInvoiceRecord,
  updateInvoiceStatus,
} from "./storage";
import {
  UpdateInvoiceParams,
  cancelInvoice,
  getFullInvoice,
  getInvoiceStatus,
  isValidEmail,
  sendInvoice,
  updateDueDate,
  updateInvoice,
} from "./paypal";

// ── Status display helpers ──────────────────────────────────────────────────

const STATUS_ORDER = [
  "DRAFT",
  "SENT",
  "UNPAID",
  "OVERDUE",
  "PAID",
  "REFUNDED",
  "CANCELLED",
];

const PAYPAL_TERMINAL = new Set(["PAID", "CANCELLED", "REFUNDED"]);
const LOCAL_CUSTOM = new Set(["UNPAID", "OVERDUE"]);

const STATUS_COLOR: Record<string, Color> = {
  DRAFT: Color.SecondaryText,
  SENT: Color.Blue,
  UNPAID: Color.Orange,
  OVERDUE: Color.Red,
  PAID: Color.Green,
  REFUNDED: Color.Purple,
  CANCELLED: Color.SecondaryText,
};

const STATUS_ICON: Record<string, Icon> = {
  DRAFT: Icon.Document,
  SENT: Icon.Envelope,
  UNPAID: Icon.Clock,
  OVERDUE: Icon.ExclamationMark,
  PAID: Icon.Checkmark,
  REFUNDED: Icon.ArrowCounterClockwise,
  CANCELLED: Icon.XMarkCircle,
};

function formatDate(iso: string): string {
  // Date-only strings (YYYY-MM-DD) must be parsed as local time, not UTC
  const d = iso.includes("T") ? new Date(iso) : new Date(iso + "T00:00:00");
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatAmount(currency: string, total: number): string {
  return `${currency} ${total.toFixed(2)}`;
}

// ── Grouping & sorting ──────────────────────────────────────────────────────

function groupInvoices(
  invoices: InvoiceRecord[],
  groupBy: ListPreferences["groupBy"],
): Record<string, InvoiceRecord[]> {
  const groups: Record<string, InvoiceRecord[]> = {};

  for (const invoice of invoices) {
    let key: string;
    switch (groupBy) {
      case "status":
        key = invoice.status;
        break;
      case "recipient":
        key = invoice.recipientName;
        break;
      case "currency":
        key = invoice.currency;
        break;
      case "month":
        key = new Date(invoice.createdAt).toLocaleDateString("en-US", {
          month: "long",
          year: "numeric",
        });
        break;
    }
    if (!groups[key]) groups[key] = [];
    groups[key].push(invoice);
  }

  return groups;
}

function sortInvoices(
  invoices: InvoiceRecord[],
  sortBy: ListPreferences["sortBy"],
  order: ListPreferences["order"],
): InvoiceRecord[] {
  const sorted = [...invoices].sort((a, b) => {
    switch (sortBy) {
      case "createdAt":
        return (
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );
      case "amount":
        return a.total - b.total;
      case "recipient":
        return a.recipientName.localeCompare(b.recipientName);
    }
  });
  return order === "desc" ? sorted.reverse() : sorted;
}

function getOrderLabel(
  sortBy: ListPreferences["sortBy"],
  order: ListPreferences["order"],
): string {
  const asc = order === "asc";
  switch (sortBy) {
    case "createdAt":
      return asc ? "Oldest First" : "Newest First";
    case "amount":
      return asc ? "Lowest First" : "Highest First";
    case "recipient":
      return asc ? "A → Z" : "Z → A";
  }
}

function applyFilter(
  invoices: InvoiceRecord[],
  filter: string,
): InvoiceRecord[] {
  if (filter === "all") return invoices;

  if (filter.startsWith("status:")) {
    const status = filter.slice(7);
    return invoices.filter((i) => i.status === status);
  }

  if (filter.startsWith("time:")) {
    const key = filter.slice(5);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Week boundaries (Mon–Sun)
    const dow = today.getDay(); // 0=Sun
    const toMon = dow === 0 ? -6 : 1 - dow;
    const thisWeekStart = new Date(today);
    thisWeekStart.setDate(today.getDate() + toMon);
    const lastWeekStart = new Date(thisWeekStart);
    lastWeekStart.setDate(thisWeekStart.getDate() - 7);
    const nextWeekStart = new Date(thisWeekStart);
    nextWeekStart.setDate(thisWeekStart.getDate() + 7);
    const nextWeekEnd = new Date(nextWeekStart);
    nextWeekEnd.setDate(nextWeekStart.getDate() + 7);

    // Month boundaries
    const thisMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const nextMonthStart = new Date(
      today.getFullYear(),
      today.getMonth() + 1,
      1,
    );
    const lastMonthStart = new Date(
      today.getFullYear(),
      today.getMonth() - 1,
      1,
    );

    // 30-day windows
    const prev30Start = new Date(today);
    prev30Start.setDate(today.getDate() - 30);
    const next30End = new Date(today);
    next30End.setDate(today.getDate() + 30);

    switch (key) {
      case "this_week":
        return invoices.filter((i) => {
          const d = new Date(i.createdAt);
          return d >= thisWeekStart && d < nextWeekStart;
        });
      case "last_week":
        return invoices.filter((i) => {
          const d = new Date(i.createdAt);
          return d >= lastWeekStart && d < thisWeekStart;
        });
      case "next_week":
        return invoices.filter((i) => {
          if (!i.dueDate) return false;
          const d = new Date(i.dueDate + "T00:00:00");
          return d >= nextWeekStart && d < nextWeekEnd;
        });
      case "this_month":
        return invoices.filter((i) => {
          const d = new Date(i.createdAt);
          return d >= thisMonthStart && d < nextMonthStart;
        });
      case "last_month":
        return invoices.filter((i) => {
          const d = new Date(i.createdAt);
          return d >= lastMonthStart && d < thisMonthStart;
        });
      case "next_30_days":
        return invoices.filter((i) => {
          if (!i.dueDate) return false;
          const d = new Date(i.dueDate + "T00:00:00");
          return d >= today && d <= next30End;
        });
      case "prev_30_days":
        return invoices.filter((i) => {
          const d = new Date(i.createdAt);
          return d >= prev30Start && d < today;
        });
    }
  }

  return invoices;
}

// ── Set Due Date form ───────────────────────────────────────────────────────

function SetDueDateForm({
  invoice,
  onUpdate,
}: {
  invoice: InvoiceRecord;
  onUpdate: (changes: Partial<InvoiceRecord>) => void;
}) {
  const { pop } = useNavigation();
  const [dueDate, setDueDate] = useState<Date | null>(
    invoice.dueDate ? new Date(invoice.dueDate + "T00:00:00") : null,
  );
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit() {
    setIsLoading(true);
    try {
      await showToast({
        style: Toast.Style.Animated,
        title: "Updating due date…",
      });
      const dueDateStr = dueDate
        ? `${dueDate.getFullYear()}-${String(dueDate.getMonth() + 1).padStart(2, "0")}-${String(dueDate.getDate()).padStart(2, "0")}`
        : null;
      await updateDueDate(invoice.invoiceId, dueDateStr);
      await updateInvoiceRecord(invoice.invoiceId, {
        dueDate: dueDateStr ?? undefined,
      });
      onUpdate({ dueDate: dueDateStr ?? undefined });
      await showToast({
        style: Toast.Style.Success,
        title: "Due date updated",
      });
      pop();
    } catch (err) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to update due date",
        message: String(err),
      });
      setIsLoading(false);
    }
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Update Due Date"
            icon={Icon.Calendar}
            onSubmit={handleSubmit}
          />
        </ActionPanel>
      }
    >
      <Form.Description
        title="Set Due Date"
        text={`Update the due date for invoice to ${invoice.recipientName}. Leave blank to remove the due date.`}
      />
      <Form.DatePicker
        id="dueDate"
        title="Due Date"
        value={dueDate}
        onChange={setDueDate}
        type={Form.DatePicker.Type.Date}
      />
    </Form>
  );
}

// ── Edit Invoice form ───────────────────────────────────────────────────────

interface EditLineItem {
  id: string;
  name: string;
  description: string;
  quantity: string;
  price: string;
}

let editItemCounter = 0;
function newEditItem(): EditLineItem {
  return {
    id: String(++editItemCounter),
    name: "",
    description: "",
    quantity: "1",
    price: "",
  };
}

function calcTotal(items: EditLineItem[], taxPercent: string): number {
  const subtotal = items.reduce((sum, item) => {
    return (
      sum + (parseFloat(item.quantity) || 0) * (parseFloat(item.price) || 0)
    );
  }, 0);
  const tax = taxPercent ? subtotal * (parseFloat(taxPercent) / 100) : 0;
  return subtotal + tax;
}

type ResolvedInvoice = Awaited<ReturnType<typeof getFullInvoice>>;

type ParsedInvoiceFormData = {
  note: string;
  taxPercent: string;
  taxName: string;
  allowTip: boolean;
  allowPartialPayment: boolean;
  items: EditLineItem[];
};

function parseInvoiceFormData(data: ResolvedInvoice): ParsedInvoiceFormData {
  const detail = data.detail as { note?: string } | undefined;
  const rawItems = data.items as
    | Array<{
        name?: string;
        description?: string;
        quantity?: string;
        unit_amount?: { value?: string };
        tax?: { percent?: string; name?: string };
      }>
    | undefined;
  const firstTax = rawItems?.[0]?.tax;
  const config = data.configuration as
    | {
        allow_tip?: boolean;
        partial_payment?: { allow_partial_payment?: boolean };
      }
    | undefined;
  return {
    note: detail?.note ?? "",
    taxPercent: firstTax?.percent ?? "",
    taxName: firstTax?.name ?? "",
    allowTip: config?.allow_tip ?? false,
    allowPartialPayment:
      config?.partial_payment?.allow_partial_payment ?? false,
    items:
      rawItems && rawItems.length > 0
        ? rawItems.map((item) => ({
            id: String(++editItemCounter),
            name: item.name ?? "",
            description: item.description ?? "",
            quantity: item.quantity ?? "1",
            price: item.unit_amount?.value ?? "",
          }))
        : [newEditItem()],
  };
}

function EditInvoiceForm({
  invoice,
  onUpdate,
}: {
  invoice: InvoiceRecord;
  onUpdate: (changes: Partial<InvoiceRecord>) => void;
}) {
  const { pop } = useNavigation();

  // Read directly from module-level cache at mount time (lazy initializer).
  // This always reflects the freshest cached value, even if the parent
  // rendered before the background fetch completed.
  const [parsed] = useState<ParsedInvoiceFormData | null>(() => {
    const cached = prefetchCache.get(invoice.invoiceId);
    return cached ? parseInvoiceFormData(cached) : null;
  });

  const [note, setNote] = useState(() => parsed?.note ?? "");
  const [dueDate, setDueDate] = useState<Date | null>(
    invoice.dueDate ? new Date(invoice.dueDate + "T00:00:00") : null,
  );
  const [taxPercent, setTaxPercent] = useState(() => parsed?.taxPercent ?? "");
  const [taxName, setTaxName] = useState(() => parsed?.taxName ?? "");
  const [allowTip, setAllowTip] = useState(() => parsed?.allowTip ?? false);
  const [allowPartialPayment, setAllowPartialPayment] = useState(
    () => parsed?.allowPartialPayment ?? false,
  );
  const [notifyRecipient, setNotifyRecipient] = useState(false);
  const [items, setItems] = useState<EditLineItem[]>(
    () => parsed?.items ?? [newEditItem()],
  );
  const [itemErrors, setItemErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(
    () => !prefetchCache.has(invoice.invoiceId),
  );

  useEffect(() => {
    if (prefetchCache.has(invoice.invoiceId)) return;
    getFullInvoice(invoice.invoiceId)
      .then((data) => {
        const p = parseInvoiceFormData(data);
        setNote(p.note);
        setTaxPercent(p.taxPercent);
        setTaxName(p.taxName);
        setAllowTip(p.allowTip);
        setAllowPartialPayment(p.allowPartialPayment);
        setItems(p.items);
      })
      .catch(() => {
        /* ignore, form starts with blank defaults */
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  function addItem() {
    setItems((prev) => [...prev, newEditItem()]);
  }

  function updateItem(
    id: string,
    field: keyof Omit<EditLineItem, "id">,
    value: string,
  ) {
    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, [field]: value } : i)),
    );
    if (field === "name" || field === "price") {
      setItemErrors((prev) => {
        const next = { ...prev };
        delete next[`${id}-${field}`];
        return next;
      });
    }
  }

  function validate(): boolean {
    let valid = true;
    const errors: Record<string, string> = {};
    for (const item of items) {
      if (!item.name.trim()) {
        errors[`${item.id}-name`] = "Item name required";
        valid = false;
      }
      if (
        !item.price ||
        isNaN(parseFloat(item.price)) ||
        parseFloat(item.price) <= 0
      ) {
        errors[`${item.id}-price`] = "Valid price required";
        valid = false;
      }
    }
    setItemErrors(errors);
    return valid;
  }

  async function handleSubmit() {
    if (!validate()) return;
    setIsLoading(true);

    try {
      await showToast({
        style: Toast.Style.Animated,
        title: "Updating invoice…",
      });

      const newTotal = calcTotal(items, taxPercent);
      const dueDateStr = dueDate
        ? `${dueDate.getFullYear()}-${String(dueDate.getMonth() + 1).padStart(2, "0")}-${String(dueDate.getDate()).padStart(2, "0")}`
        : undefined;

      const params: UpdateInvoiceParams = {
        invoiceId: invoice.invoiceId,
        recipientName: invoice.recipientName,
        recipientEmail: invoice.recipientEmail,
        currency: invoice.currency,
        note: note.trim() || undefined,
        dueDate: dueDateStr,
        taxPercent: taxPercent ? parseFloat(taxPercent) : undefined,
        taxName: taxName.trim() || undefined,
        allowTip,
        allowPartialPayment,
        notifyRecipient,
        items,
      };

      await updateInvoice(params);
      prefetchCache.delete(invoice.invoiceId);
      deleteInvoiceDetail(invoice.invoiceId).catch(() => {
        /* ignore */
      });
      await updateInvoiceRecord(invoice.invoiceId, {
        total: newTotal,
        dueDate: dueDateStr,
      });
      onUpdate({ total: newTotal, dueDate: dueDateStr });

      await showToast({ style: Toast.Style.Success, title: "Invoice updated" });
      pop();
    } catch (err) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to update invoice",
        message: String(err),
      });
      setIsLoading(false);
    }
  }

  const subtotal = items.reduce(
    (sum, item) =>
      sum + (parseFloat(item.quantity) || 0) * (parseFloat(item.price) || 0),
    0,
  );
  const taxAmount = taxPercent ? subtotal * (parseFloat(taxPercent) / 100) : 0;
  const total = subtotal + taxAmount;
  const fmt = (n: number) => `${invoice.currency} ${n.toFixed(2)}`;

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Save Changes"
            icon={Icon.Checkmark}
            onSubmit={handleSubmit}
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
      <Form.Description
        title="Edit Invoice"
        text={`Editing invoice for ${invoice.recipientName}. Recipient email cannot be changed here.`}
      />

      <Form.Separator />

      <Form.Description
        title="Invoice Details"
        text="Update the due date and note for this invoice."
      />
      <Form.DatePicker
        id="dueDate"
        title="Due Date"
        value={dueDate}
        onChange={setDueDate}
        type={Form.DatePicker.Type.Date}
      />
      <Form.TextArea
        id="note"
        title="Note to Customer"
        placeholder="e.g. Thanks for your business!"
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
            placeholder="e.g. Logo design"
            value={item.name}
            error={itemErrors[`${item.id}-name`]}
            onChange={(v) => updateItem(item.id, "name", v)}
          />
          <Form.TextArea
            id={`item-desc-${item.id}`}
            title="Description (optional)"
            placeholder="Additional details"
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
        text="Leave blank to remove tax from this invoice."
      />
      <Form.TextField
        id="taxName"
        title="Tax Name"
        placeholder="e.g. VAT, GST"
        value={taxName}
        onChange={setTaxName}
      />
      <Form.TextField
        id="taxPercent"
        title="Tax Rate (%)"
        placeholder="e.g. 10"
        value={taxPercent}
        onChange={setTaxPercent}
      />

      <Form.Separator />

      <Form.Description title="Payment Options" text="" />
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

      <Form.Checkbox
        id="notifyRecipient"
        title="Notify Client"
        label="Send the client an email about these changes"
        value={notifyRecipient}
        onChange={setNotifyRecipient}
      />

      <Form.Separator />

      <Form.Description
        title="Summary"
        text={[
          `Subtotal   ${fmt(subtotal)}`,
          taxPercent
            ? `${taxName || "Tax"} (${taxPercent}%)   ${fmt(taxAmount)}`
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

// ── Main command ────────────────────────────────────────────────────────────

// Module-level cache so it survives component remounts during navigation.
const prefetchCache = new Map<string, ResolvedInvoice>();

export default function MyInvoicesCommand() {
  const [invoices, setInvoices] = useState<InvoiceRecord[]>([]);
  const [prefs, setPrefs] = useState<ListPreferences>({
    groupBy: "status",
    sortBy: "createdAt",
    order: "desc",
  });
  const [isLoading, setIsLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [filter, setFilter] = useState<string>("all");

  useEffect(() => {
    async function load() {
      setIsLoading(true);
      const [records, savedPrefs, storedDetails] = await Promise.all([
        loadInvoices(),
        loadListPreferences(),
        loadAllInvoiceDetails(),
      ]);
      setInvoices(records);
      setPrefs(savedPrefs);
      setIsLoading(false);

      // Seed memory cache instantly from LocalStorage — Edit form opens with zero delay.
      for (const record of records) {
        if (
          storedDetails[record.invoiceId] &&
          !prefetchCache.has(record.invoiceId)
        ) {
          prefetchCache.set(
            record.invoiceId,
            storedDetails[record.invoiceId] as ResolvedInvoice,
          );
        }
      }

      // Background-refresh all invoices from the API.
      // Collect all results first, then write LocalStorage in one shot
      // to avoid parallel read-modify-write races overwriting each other.
      const freshDetails: Record<string, unknown> = { ...storedDetails };
      const fetchPromises = records.map((record) =>
        getFullInvoice(record.invoiceId)
          .then((data) => {
            prefetchCache.set(record.invoiceId, data);
            freshDetails[record.invoiceId] = data;
          })
          .catch(() => {
            /* silently ignore */
          }),
      );
      Promise.all(fetchPromises)
        .then(() => saveAllInvoiceDetails(freshDetails))
        .catch(() => {
          /* ignore */
        });

      const toRefresh = records.filter(
        (r) =>
          r.status !== "PAID" &&
          r.status !== "CANCELLED" &&
          r.status !== "REFUNDED",
      );
      for (const record of toRefresh) {
        try {
          const { status, invoicerViewUrl } = await getInvoiceStatus(
            record.invoiceId,
          );
          const normalized = status as InvoiceRecord["status"];
          if (
            normalized !== record.status &&
            (!LOCAL_CUSTOM.has(record.status) ||
              PAYPAL_TERMINAL.has(normalized))
          ) {
            await updateInvoiceStatus(record.invoiceId, normalized);
            setInvoices((prev) =>
              prev.map((i) =>
                i.invoiceId === record.invoiceId
                  ? { ...i, status: normalized, invoicerViewUrl }
                  : i,
              ),
            );
          }
        } catch {
          // silently skip
        }
      }
    }
    load();
  }, [refreshKey]);

  async function updatePrefs(changes: Partial<ListPreferences>) {
    const updated = { ...prefs, ...changes };
    setPrefs(updated);
    await saveListPreferences(updated);
  }

  function updateLocalInvoice(
    invoiceId: string,
    changes: Partial<InvoiceRecord>,
  ) {
    setInvoices((prev) =>
      prev.map((i) => (i.invoiceId === invoiceId ? { ...i, ...changes } : i)),
    );
  }

  async function handleCopyLink(invoice: InvoiceRecord) {
    try {
      if (invoice.payerViewUrl) {
        await Clipboard.copy(invoice.payerViewUrl);
        await showHUD("Invoice link copied ✓");
      } else {
        await showToast({
          style: Toast.Style.Animated,
          title: "Generating link…",
        });
        const url = await sendInvoice(invoice.invoiceId, false);
        await updateInvoiceStatus(invoice.invoiceId, "UNPAID", url);
        updateLocalInvoice(invoice.invoiceId, {
          status: "UNPAID",
          payerViewUrl: url,
        });
        await Clipboard.copy(url);
        await showHUD("Invoice link copied ✓");
      }
    } catch (err) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed",
        message: String(err),
      });
    }
  }

  async function handleSend(invoice: InvoiceRecord) {
    if (!invoice.recipientEmail) return;
    try {
      await showToast({ style: Toast.Style.Animated, title: "Sending…" });
      const url = await sendInvoice(invoice.invoiceId, true);
      await updateInvoiceStatus(invoice.invoiceId, "SENT", url);
      updateLocalInvoice(invoice.invoiceId, {
        status: "SENT",
        payerViewUrl: url,
      });
      await Clipboard.copy(url);
      await showHUD(`Sent to ${invoice.recipientEmail} — link copied ✓`);
    } catch (err) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed",
        message: String(err),
      });
    }
  }

  async function handleDelete(invoice: InvoiceRecord) {
    const confirmed = await confirmAlert({
      title: "Remove from list?",
      message: `This removes the invoice for ${invoice.recipientName} from your local list. The invoice still exists in PayPal.`,
      primaryAction: { title: "Remove", style: Alert.ActionStyle.Destructive },
    });
    if (!confirmed) return;
    await deleteInvoice(invoice.invoiceId);
    setInvoices((prev) =>
      prev.filter((i) => i.invoiceId !== invoice.invoiceId),
    );
  }

  async function handleCancel(invoice: InvoiceRecord) {
    const confirmed = await confirmAlert({
      title: "Cancel invoice?",
      message: `This cancels the invoice for ${invoice.recipientName} on PayPal. This cannot be undone.`,
      primaryAction: {
        title: "Cancel Invoice",
        style: Alert.ActionStyle.Destructive,
      },
    });
    if (!confirmed) return;
    try {
      await showToast({
        style: Toast.Style.Animated,
        title: "Cancelling invoice…",
      });
      await cancelInvoice(invoice.invoiceId);
      await updateInvoiceStatus(invoice.invoiceId, "CANCELLED");
      setInvoices((prev) =>
        prev.map((i) =>
          i.invoiceId === invoice.invoiceId ? { ...i, status: "CANCELLED" } : i,
        ),
      );
      await showToast({
        style: Toast.Style.Success,
        title: "Invoice cancelled",
      });
    } catch (err) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to cancel",
        message: String(err),
      });
    }
  }

  const filtered = applyFilter(invoices, filter);
  const sorted = sortInvoices(filtered, prefs.sortBy, prefs.order);
  const grouped =
    prefs.groupBy === "status"
      ? STATUS_ORDER.reduce<Record<string, InvoiceRecord[]>>((acc, status) => {
          const group = sorted.filter((i) => i.status === status);
          if (group.length > 0) acc[status] = group;
          return acc;
        }, {})
      : groupInvoices(sorted, prefs.groupBy);

  const filterDropdown = (
    <List.Dropdown
      tooltip="Filter invoices"
      value={filter}
      onChange={setFilter}
    >
      <List.Dropdown.Item title="All Invoices" value="all" icon={Icon.List} />
      <List.Dropdown.Section title="By Status">
        {STATUS_ORDER.map((s) => (
          <List.Dropdown.Item
            key={s}
            title={s.charAt(0) + s.slice(1).toLowerCase()}
            value={`status:${s}`}
            icon={{ source: STATUS_ICON[s], tintColor: STATUS_COLOR[s] }}
          />
        ))}
      </List.Dropdown.Section>
      <List.Dropdown.Section title="By Date">
        <List.Dropdown.Item
          title="This Week"
          value="time:this_week"
          icon={Icon.Calendar}
        />
        <List.Dropdown.Item
          title="Last Week"
          value="time:last_week"
          icon={Icon.Calendar}
        />
        <List.Dropdown.Item
          title="Next Week (by due date)"
          value="time:next_week"
          icon={Icon.Calendar}
        />
        <List.Dropdown.Item
          title="This Month"
          value="time:this_month"
          icon={Icon.Calendar}
        />
        <List.Dropdown.Item
          title="Last Month"
          value="time:last_month"
          icon={Icon.Calendar}
        />
        <List.Dropdown.Item
          title="Next 30 Days (by due date)"
          value="time:next_30_days"
          icon={Icon.Calendar}
        />
        <List.Dropdown.Item
          title="Previous 30 Days"
          value="time:prev_30_days"
          icon={Icon.Calendar}
        />
      </List.Dropdown.Section>
    </List.Dropdown>
  );

  function handleSelectionChange(id: string | null) {
    if (!id || prefetchCache.has(id)) return;
    getFullInvoice(id)
      .then((data) => {
        prefetchCache.set(id, data);
      })
      .catch(() => {
        /* silently ignore prefetch failures */
      });
  }

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search invoices…"
      searchBarAccessory={filterDropdown}
      onSelectionChange={handleSelectionChange}
    >
      {Object.entries(grouped).map(([groupKey, records]) => (
        <List.Section
          key={groupKey}
          title={groupKey}
          subtitle={`${records.length}`}
        >
          {records.map((invoice) => (
            <List.Item
              key={invoice.invoiceId}
              id={invoice.invoiceId}
              icon={{
                source: STATUS_ICON[invoice.status],
                tintColor: STATUS_COLOR[invoice.status],
              }}
              title={invoice.recipientName}
              subtitle={invoice.recipientEmail ?? "No email"}
              accessories={[
                { text: formatAmount(invoice.currency, invoice.total) },
                ...(invoice.dueDate
                  ? [
                      {
                        text: `Due ${formatDate(invoice.dueDate)}`,
                        icon: Icon.Calendar,
                      },
                    ]
                  : [
                      {
                        text: formatDate(invoice.createdAt),
                        icon: Icon.Calendar,
                      },
                    ]),
              ]}
              actions={
                <ActionPanel>
                  <ActionPanel.Section title="Invoice">
                    <Action
                      title="Copy Invoice Link"
                      icon={Icon.Link}
                      onAction={() => handleCopyLink(invoice)}
                    />
                    {invoice.recipientEmail &&
                      isValidEmail(invoice.recipientEmail) &&
                      !PAYPAL_TERMINAL.has(invoice.status) && (
                        <Action
                          title={`Send to ${invoice.recipientEmail}`}
                          icon={Icon.Envelope}
                          onAction={() => handleSend(invoice)}
                        />
                      )}
                    <Action
                      title="Review in Browser"
                      icon={Icon.Eye}
                      shortcut={{
                        macOS: { modifiers: ["cmd"], key: "return" },
                        Windows: { modifiers: ["ctrl"], key: "return" },
                      }}
                      onAction={() => open(invoice.invoicerViewUrl)}
                    />
                  </ActionPanel.Section>

                  <ActionPanel.Section title="Edit">
                    <Action.Push
                      title="Edit Invoice"
                      icon={Icon.Pencil}
                      shortcut={{
                        macOS: { modifiers: ["cmd"], key: "e" },
                        Windows: { modifiers: ["ctrl"], key: "e" },
                      }}
                      target={
                        <EditInvoiceForm
                          invoice={invoice}
                          onUpdate={(changes) =>
                            updateLocalInvoice(invoice.invoiceId, changes)
                          }
                        />
                      }
                    />
                    <Action.Push
                      title="Set Due Date"
                      icon={Icon.Calendar}
                      shortcut={{
                        macOS: { modifiers: ["cmd", "shift"], key: "d" },
                        Windows: { modifiers: ["ctrl", "shift"], key: "d" },
                      }}
                      target={
                        <SetDueDateForm
                          invoice={invoice}
                          onUpdate={(changes) =>
                            updateLocalInvoice(invoice.invoiceId, changes)
                          }
                        />
                      }
                    />
                  </ActionPanel.Section>

                  <ActionPanel.Section title="View">
                    <ActionPanel.Submenu
                      title="Group by…"
                      icon={Icon.AppWindowGrid3x3}
                      shortcut={{
                        macOS: { modifiers: ["cmd", "shift"], key: "g" },
                        Windows: { modifiers: ["ctrl", "shift"], key: "g" },
                      }}
                    >
                      {[
                        { value: "status", label: "Status", icon: Icon.Circle },
                        {
                          value: "recipient",
                          label: "Recipient",
                          icon: Icon.Person,
                        },
                        {
                          value: "currency",
                          label: "Currency",
                          icon: Icon.Coins,
                        },
                        { value: "month", label: "Month", icon: Icon.Calendar },
                      ].map((opt) => (
                        <Action
                          key={opt.value}
                          title={opt.label}
                          icon={
                            prefs.groupBy === opt.value
                              ? {
                                  source: Icon.Checkmark,
                                  tintColor: Color.Green,
                                }
                              : opt.icon
                          }
                          onAction={() =>
                            updatePrefs({
                              groupBy: opt.value as ListPreferences["groupBy"],
                            })
                          }
                        />
                      ))}
                    </ActionPanel.Submenu>
                    <ActionPanel.Submenu
                      title="Sort by…"
                      icon={Icon.BulletPoints}
                      shortcut={{
                        macOS: { modifiers: ["cmd", "shift"], key: "s" },
                        Windows: { modifiers: ["ctrl", "shift"], key: "s" },
                      }}
                    >
                      {[
                        {
                          value: "createdAt",
                          label: "Creation Date",
                          icon: Icon.Clock,
                        },
                        { value: "amount", label: "Amount", icon: Icon.Coins },
                        {
                          value: "recipient",
                          label: "Recipient Name",
                          icon: Icon.Person,
                        },
                      ].map((opt) => (
                        <Action
                          key={opt.value}
                          title={opt.label}
                          icon={
                            prefs.sortBy === opt.value
                              ? {
                                  source: Icon.Checkmark,
                                  tintColor: Color.Green,
                                }
                              : opt.icon
                          }
                          onAction={() =>
                            updatePrefs({
                              sortBy: opt.value as ListPreferences["sortBy"],
                            })
                          }
                        />
                      ))}
                    </ActionPanel.Submenu>
                    <ActionPanel.Submenu
                      title={`Order: ${getOrderLabel(prefs.sortBy, prefs.order)}`}
                      icon={
                        prefs.order === "desc" ? Icon.ArrowDown : Icon.ArrowUp
                      }
                      shortcut={{
                        macOS: { modifiers: ["cmd", "shift"], key: "o" },
                        Windows: { modifiers: ["ctrl", "shift"], key: "o" },
                      }}
                    >
                      {[
                        {
                          value: "desc",
                          label: "Descending",
                          icon: Icon.ArrowDown,
                        },
                        {
                          value: "asc",
                          label: "Ascending",
                          icon: Icon.ArrowUp,
                        },
                      ].map((opt) => (
                        <Action
                          key={opt.value}
                          title={opt.label}
                          icon={
                            prefs.order === opt.value
                              ? {
                                  source: Icon.Checkmark,
                                  tintColor: Color.Green,
                                }
                              : opt.icon
                          }
                          onAction={() =>
                            updatePrefs({
                              order: opt.value as ListPreferences["order"],
                            })
                          }
                        />
                      ))}
                    </ActionPanel.Submenu>
                  </ActionPanel.Section>

                  <ActionPanel.Section>
                    <Action
                      title="Refresh Status"
                      icon={Icon.ArrowClockwise}
                      shortcut={{
                        macOS: { modifiers: ["cmd"], key: "r" },
                        Windows: { modifiers: ["ctrl"], key: "r" },
                      }}
                      onAction={() => setRefreshKey((k) => k + 1)}
                    />
                    {(invoice.status === "SENT" ||
                      invoice.status === "UNPAID" ||
                      invoice.status === "OVERDUE") && (
                      <Action
                        title="Cancel Invoice"
                        icon={Icon.XMarkCircle}
                        style={Action.Style.Destructive}
                        shortcut={{
                          macOS: { modifiers: ["cmd", "shift"], key: "x" },
                          Windows: { modifiers: ["ctrl", "shift"], key: "x" },
                        }}
                        onAction={() => handleCancel(invoice)}
                      />
                    )}
                    <Action
                      title="Remove from List"
                      icon={Icon.Trash}
                      style={Action.Style.Destructive}
                      shortcut={{
                        macOS: { modifiers: ["cmd"], key: "backspace" },
                        Windows: { modifiers: ["ctrl"], key: "delete" },
                      }}
                      onAction={() => handleDelete(invoice)}
                    />
                  </ActionPanel.Section>
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      ))}
      {!isLoading && filtered.length === 0 && (
        <List.EmptyView
          icon={filter === "all" ? Icon.Document : Icon.MagnifyingGlass}
          title={
            filter === "all"
              ? "No invoices yet"
              : "No invoices match this filter"
          }
          description={
            filter === "all"
              ? "Create your first invoice with the Create Invoice command."
              : "Try selecting a different filter from the dropdown."
          }
        />
      )}
    </List>
  );
}
