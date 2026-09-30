import { Invoice } from "./types";

function escapeCSV(value: string): string {
  let safe = value;
  if (/^[=+\-@\t\r]/.test(safe)) {
    safe = `'${safe}`;
  }
  if (safe.includes(",") || safe.includes('"') || safe.includes("\n")) {
    return `"${safe.replace(/"/g, '""')}"`;
  }
  return safe;
}

export function generateCSV(invoices: Invoice[]): string {
  const headers = [
    "Invoice Number",
    "Client Name",
    "Client Email",
    "Invoice Date",
    "Due Date",
    "Subtotal",
    "VAT Amount",
    "Total",
    "VAT Applied",
    "Status",
    "Notes",
    "PDF Path",
  ];

  const rows = invoices.map((inv) =>
    [
      escapeCSV(inv.invoiceNumber),
      escapeCSV(inv.clientName),
      escapeCSV(inv.clientEmail),
      inv.invoiceDate,
      inv.dueDate,
      inv.subtotal.toFixed(2),
      inv.vatAmount.toFixed(2),
      inv.total.toFixed(2),
      inv.vatApplied ? "Yes" : "No",
      inv.status.charAt(0).toUpperCase() + inv.status.slice(1),
      escapeCSV(inv.notes),
      escapeCSV(inv.pdfPath),
    ].join(","),
  );

  return [headers.join(","), ...rows].join("\n");
}
