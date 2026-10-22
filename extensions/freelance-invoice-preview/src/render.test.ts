import assert from "node:assert";
import { computeTotals, money, renderHtml, renderMarkdown } from "./render";
import type { InvoiceData } from "./render";

const sample: InvoiceData = {
  invoice_number: "INV-0001",
  from: "Jane Doe",
  to: "Acme Corp",
  date: "2026-10-14",
  due_date: "2026-10-28",
  tax_rate: 10,
  items: [
    { description: "Website redesign", qty: 1, rate: 1800 },
    { description: "Extra revision round", qty: 2, rate: 90 },
  ],
  notes: "Net 14.",
};

function test(name: string, fn: () => void) {
  try {
    fn();
    console.log(`ok - ${name}`);
  } catch (e) {
    console.error(`FAIL - ${name}`);
    throw e;
  }
}

test("money formats with 2 decimals and thousands separator", () => {
  assert.strictEqual(money(1234.5), "$1,234.50");
  assert.strictEqual(money(-5), "-$5.00");
});

test("computeTotals sums qty*rate and applies tax_rate", () => {
  const { subtotal, tax, total } = computeTotals(sample);
  assert.strictEqual(subtotal, 1800 + 180);
  assert.strictEqual(tax, (1800 + 180) * 0.1);
  assert.strictEqual(total, subtotal + tax);
});

test("computeTotals defaults tax to 0 when tax_rate is missing", () => {
  const { tax, total, subtotal } = computeTotals({
    items: [{ description: "x", qty: 1, rate: 100 }],
  });
  assert.strictEqual(tax, 0);
  assert.strictEqual(total, subtotal);
});

test("renderHtml escapes HTML in user-supplied fields", () => {
  const html = renderHtml({
    ...sample,
    notes: "<script>alert(1)</script>",
  });
  assert.ok(!html.includes("<script>alert(1)</script>"));
  assert.ok(html.includes("&lt;script&gt;"));
});

test("renderHtml includes invoice number, totals and line items", () => {
  const html = renderHtml(sample);
  assert.ok(html.includes("INV-0001"));
  assert.ok(html.includes("Website redesign"));
  assert.ok(html.includes("Total:"));
});

test("renderMarkdown produces a markdown table with the same total", () => {
  const md = renderMarkdown(sample);
  const { total } = computeTotals(sample);
  assert.ok(md.includes("| Website redesign |"));
  assert.ok(md.includes(money(total)));
});

test("renderMarkdown omits tax line when tax_rate is 0/undefined", () => {
  const md = renderMarkdown({
    items: [{ description: "x", qty: 1, rate: 100 }],
  });
  assert.ok(!md.includes("Tax ("));
});

console.log("all tests passed");
