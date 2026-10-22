export interface InvoiceItem {
  description: string;
  qty: number;
  rate: number;
}

export interface InvoiceData {
  invoice_number?: string;
  from?: string;
  to?: string;
  date?: string;
  due_date?: string;
  items: InvoiceItem[];
  tax_rate?: number;
  notes?: string;
}

function escapeHtml(s: string): string {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
}

export function money(n: number): string {
  const sign = n < 0 ? "-" : "";
  const abs = Math.abs(n);
  return `${sign}$${abs.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function computeTotals(data: InvoiceData) {
  const subtotal = data.items.reduce((acc, i) => acc + i.qty * i.rate, 0);
  const taxRate = data.tax_rate || 0;
  const tax = (subtotal * taxRate) / 100;
  const total = subtotal + tax;
  return { subtotal, taxRate, tax, total };
}

export function renderHtml(data: InvoiceData): string {
  const { subtotal, taxRate, tax, total } = computeTotals(data);

  const rows = data.items
    .map(
      (i) =>
        `<tr><td>${escapeHtml(i.description)}</td>` +
        `<td style='text-align:right'>${escapeHtml(String(i.qty))}</td>` +
        `<td style='text-align:right'>${money(i.rate)}</td>` +
        `<td style='text-align:right'>${money(i.qty * i.rate)}</td></tr>`,
    )
    .join("\n");

  const notes = escapeHtml(data.notes || "");
  const invoiceNumber = escapeHtml(data.invoice_number || "");

  return `<!doctype html><html><head><meta charset="utf-8">
<title>Invoice ${invoiceNumber}</title>
<style>
body{font-family:-apple-system,Arial,sans-serif;max-width:680px;margin:40px auto;color:#1a1a1a}
table{width:100%;border-collapse:collapse;margin-top:24px}
th,td{padding:8px;border-bottom:1px solid #ddd}
th{text-align:left;color:#666;font-size:13px;text-transform:uppercase}
.total{font-size:20px;font-weight:bold}
.meta{color:#666;font-size:14px}
@media print{body{margin:0}}
</style></head><body>
<h1>Invoice ${invoiceNumber}</h1>
<p class="meta">From: ${escapeHtml(data.from || "")}<br>
To: ${escapeHtml(data.to || "")}<br>
Date: ${escapeHtml(data.date || "")} &middot; Due: ${escapeHtml(data.due_date || "")}</p>
<table>
<tr><th>Description</th><th style="text-align:right">Qty</th><th style="text-align:right">Rate</th><th style="text-align:right">Amount</th></tr>
${rows}
</table>
<p style="text-align:right;margin-top:16px">Subtotal: ${money(subtotal)}<br>
${taxRate ? `Tax (${taxRate}%): ${money(tax)}<br>` : ""}
<span class="total">Total: ${money(total)}</span></p>
${notes ? `<p class='meta'>${notes}</p>` : ""}
</body></html>`;
}

export function renderMarkdown(data: InvoiceData): string {
  const { subtotal, taxRate, tax, total } = computeTotals(data);

  const rows = data.items
    .map(
      (i) =>
        `| ${i.description} | ${i.qty} | ${money(i.rate)} | ${money(i.qty * i.rate)} |`,
    )
    .join("\n");

  const lines = [
    `# Invoice ${data.invoice_number || ""}`,
    "",
    `**From:** ${data.from || ""}  `,
    `**To:** ${data.to || ""}  `,
    `**Date:** ${data.date || ""} · **Due:** ${data.due_date || ""}`,
    "",
    "| Description | Qty | Rate | Amount |",
    "|---|---:|---:|---:|",
    rows,
    "",
    `Subtotal: **${money(subtotal)}**  `,
  ];

  if (taxRate) {
    lines.push(`Tax (${taxRate}%): **${money(tax)}**  `);
  }
  lines.push(`### Total: ${money(total)}`);

  if (data.notes) {
    lines.push("", `_${data.notes}_`);
  }

  return lines.join("\n");
}
