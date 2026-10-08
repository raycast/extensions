import { LocalStorage, trash } from "@raycast/api";
import { STORAGE_KEYS } from "./constants";
import { Client, Invoice, InvoiceCounter, InvoiceStatus } from "./types";

// Clients

export async function getClients(): Promise<Client[]> {
  const data = await LocalStorage.getItem<string>(STORAGE_KEYS.clients);
  return data ? JSON.parse(data) : [];
}

export async function saveClients(clients: Client[]): Promise<void> {
  await LocalStorage.setItem(STORAGE_KEYS.clients, JSON.stringify(clients));
}

export async function addClient(client: Client): Promise<void> {
  const clients = await getClients();
  clients.push(client);
  await saveClients(clients);
}

export async function updateClient(updated: Client): Promise<void> {
  const clients = await getClients();
  const index = clients.findIndex((c) => c.id === updated.id);
  if (index === -1) throw new Error(`Client not found: ${updated.id}`);
  clients[index] = updated;
  await saveClients(clients);
}

export async function deleteClient(id: string): Promise<void> {
  const clients = await getClients();
  await saveClients(clients.filter((c) => c.id !== id));
}

// Invoices

export async function getInvoices(): Promise<Invoice[]> {
  const data = await LocalStorage.getItem<string>(STORAGE_KEYS.invoices);
  return data ? JSON.parse(data) : [];
}

export async function saveInvoices(invoices: Invoice[]): Promise<void> {
  await LocalStorage.setItem(STORAGE_KEYS.invoices, JSON.stringify(invoices));
}

export async function addInvoice(invoice: Invoice): Promise<void> {
  const invoices = await getInvoices();
  invoices.push(invoice);
  await saveInvoices(invoices);
}

export async function updateInvoiceStatus(id: string, status: InvoiceStatus): Promise<void> {
  const invoices = await getInvoices();
  const index = invoices.findIndex((inv) => inv.id === id);
  if (index === -1) throw new Error(`Invoice not found: ${id}`);
  invoices[index].status = status;
  invoices[index].updatedAt = new Date().toISOString();
  await saveInvoices(invoices);
}

export async function deleteInvoice(id: string): Promise<void> {
  const invoices = await getInvoices();
  const invoice = invoices.find((inv) => inv.id === id);
  if (invoice) {
    try {
      await trash(invoice.pdfPath);
    } catch {
      // PDF deletion is best-effort
    }
  }
  await saveInvoices(invoices.filter((inv) => inv.id !== id));
}

// Invoice Counter

export async function getNextInvoiceNumber(startingNumber: number): Promise<number> {
  const data = await LocalStorage.getItem<string>(STORAGE_KEYS.invoiceCounter);
  const counter: InvoiceCounter = data ? JSON.parse(data) : { currentNumber: startingNumber - 1 };
  const nextNumber = counter.currentNumber + 1;
  // Save incremented counter BEFORE returning (prevents duplicates)
  await LocalStorage.setItem(STORAGE_KEYS.invoiceCounter, JSON.stringify({ currentNumber: nextNumber }));
  return nextNumber;
}

// Helpers

export async function getInvoiceCountForClient(clientId: string): Promise<number> {
  const invoices = await getInvoices();
  return invoices.filter((inv) => inv.clientId === clientId).length;
}
