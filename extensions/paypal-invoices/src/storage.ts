import { LocalStorage } from "@raycast/api";

export interface InvoiceRecord {
  invoiceId: string;
  recipientName: string;
  recipientEmail?: string;
  currency: string;
  total: number;
  createdAt: string;
  dueDate?: string;
  status:
    | "DRAFT"
    | "SENT"
    | "PAID"
    | "CANCELLED"
    | "OVERDUE"
    | "UNPAID"
    | "REFUNDED";
  payerViewUrl?: string;
  invoicerViewUrl: string;
}

export interface ListPreferences {
  groupBy: "status" | "recipient" | "currency" | "month";
  sortBy: "createdAt" | "amount" | "recipient";
  order: "asc" | "desc";
}

const INVOICES_KEY = "paypal-invoices";
const PREFS_KEY = "paypal-list-preferences";

const DEFAULT_PREFS: ListPreferences = {
  groupBy: "status",
  sortBy: "createdAt",
  order: "desc",
};

export async function loadInvoices(): Promise<InvoiceRecord[]> {
  const raw = await LocalStorage.getItem<string>(INVOICES_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as InvoiceRecord[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function saveInvoice(record: InvoiceRecord): Promise<void> {
  const existing = await loadInvoices();
  const updated = [
    record,
    ...existing.filter((i) => i.invoiceId !== record.invoiceId),
  ];
  await LocalStorage.setItem(INVOICES_KEY, JSON.stringify(updated));
}

export async function updateInvoiceRecord(
  invoiceId: string,
  changes: Partial<InvoiceRecord>,
): Promise<void> {
  const existing = await loadInvoices();
  const updated = existing.map((i) =>
    i.invoiceId === invoiceId ? { ...i, ...changes } : i,
  );
  await LocalStorage.setItem(INVOICES_KEY, JSON.stringify(updated));
}

export async function updateInvoiceStatus(
  invoiceId: string,
  status: InvoiceRecord["status"],
  payerViewUrl?: string,
): Promise<void> {
  await updateInvoiceRecord(invoiceId, {
    status,
    ...(payerViewUrl && { payerViewUrl }),
  });
}

export async function deleteInvoice(invoiceId: string): Promise<void> {
  const existing = await loadInvoices();
  const updated = existing.filter((i) => i.invoiceId !== invoiceId);
  await LocalStorage.setItem(INVOICES_KEY, JSON.stringify(updated));
}

export async function loadListPreferences(): Promise<ListPreferences> {
  const raw = await LocalStorage.getItem<string>(PREFS_KEY);
  if (!raw) return DEFAULT_PREFS;
  try {
    return {
      ...DEFAULT_PREFS,
      ...(JSON.parse(raw) as Partial<ListPreferences>),
    };
  } catch {
    return DEFAULT_PREFS;
  }
}

export async function saveListPreferences(
  prefs: ListPreferences,
): Promise<void> {
  await LocalStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
}
