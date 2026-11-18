import { InvoiceLineItem } from "./types";

export function calculateLineTotal(quantity: number, rate: number): number {
  return Math.round(quantity * rate * 100) / 100;
}

export function calculateSubtotal(lineItems: InvoiceLineItem[]): number {
  return Math.round(lineItems.reduce((sum, item) => sum + item.lineTotal, 0) * 100) / 100;
}

export function calculateVat(subtotal: number, vatRate: number): number {
  return Math.round(subtotal * (vatRate / 100) * 100) / 100;
}

export function calculateTotal(subtotal: number, vatAmount: number): number {
  return Math.round((subtotal + vatAmount) * 100) / 100;
}

export function calculateInvoiceTotals(
  lineItems: InvoiceLineItem[],
  vatApplied: boolean,
  vatRate: number,
): { subtotal: number; vatAmount: number; total: number } {
  const subtotal = calculateSubtotal(lineItems);
  const vatAmount = vatApplied ? calculateVat(subtotal, vatRate) : 0;
  const total = calculateTotal(subtotal, vatAmount);
  return { subtotal, vatAmount, total };
}
