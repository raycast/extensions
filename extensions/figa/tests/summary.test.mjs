import assert from "node:assert/strict";
import { test } from "node:test";
import { buildShareableMonthSummary } from "../src/monthly-summary.ts";
import { formatExpenseAmount, formatExpenseDate } from "../src/format.ts";

const month = {
  year: 2026,
  month: 11,
  totalAmount: 15000,
  confirmedAmount: 10000,
  estimatedAmount: 5000,
  paidAmount: 3000,
  unpaidAmount: 7000,
  unknownCount: 0,
  isComplete: true,
};

test("shared month separates confirmed bills and forecasts, with currency and a public link", () => {
  const text = buildShareableMonthSummary(month, "CAD");
  assert.match(text, /November 2026/);
  assert.match(text, /Known total: CAD\s150\.00/);
  assert.match(text, /Estimated: CAD\s50\.00/);
  assert.match(text, /Confirmed unpaid: CAD\s70\.00/);
  assert.match(text, /Prepared with Figa — https:\/\/getfiga.com\//);
  assert.doesNotMatch(text, /workspace|api.key|et_live/);
});

test("zero known subtotal does not conceal unknown, hidden or unvalued paid expenses", () => {
  const text = buildShareableMonthSummary(
    {
      ...month,
      totalAmount: 0,
      confirmedAmount: 0,
      estimatedAmount: 0,
      paidAmount: 0,
      unpaidAmount: 0,
      unknownCount: 2,
      isComplete: false,
      planLimit: { current: 25, limit: 20, blocked: 5 },
      monetary: { baseCurrency: "PLN", estimatedFxCount: 1, paidUnknownCount: 1 },
    },
    "PLN",
  );
  assert.match(text, /2 expense\(s\) have unknown amounts/);
  assert.match(text, /only accessible expenses/);
  assert.match(text, /paid amounts cannot be valued/);
  assert.match(text, /estimated exchange rates/);
});

test("estimated exchange rates do not hide the warning about incomplete amounts", () => {
  const item = {
    ...month,
    monetary: { baseCurrency: "USD", estimatedFxCount: 1, paidUnknownCount: 0 },
  };
  const incomplete = buildShareableMonthSummary({ ...item, isComplete: false }, "USD");
  assert.match(incomplete, /Amounts are incomplete/);
  assert.match(incomplete, /estimated exchange rates/);
  const complete = buildShareableMonthSummary(item, "USD");
  assert.doesNotMatch(complete, /Amounts are incomplete/);
  assert.match(complete, /estimated exchange rates/);
});

test("list distinguishes an actual zero, a forecast and an unknown amount", () => {
  assert.match(formatExpenseAmount({ amount: 0 }, "USD"), /USD\s0\.00/);
  assert.equal(formatExpenseAmount({ amount: null }, "USD"), "Amount unknown");
  assert.match(formatExpenseAmount({ amount: 1500, bill: { state: "estimated" } }, "USD"), /estimated/);
  assert.equal(formatExpenseAmount({ amount: 1500, bill: { state: "unknown" } }, "USD"), "Amount unknown");
});

test("unpaid windows retain both dates; paid windows show the payment date", () => {
  const date = (day) => new Date(2026, 10, day, 12).getTime() / 1000;
  const expense = { expenseDate: date(1), scheduledDate: date(1), dueBy: date(10), isPaid: false };
  assert.match(formatExpenseDate(expense), /Nov 1, 2026 – Nov 10, 2026/);
  assert.equal(formatExpenseDate({ ...expense, isPaid: true, expenseDate: date(5), paidAt: date(5) }), "Nov 5, 2026");
  assert.equal(formatExpenseDate({ ...expense, dueBy: undefined, isPaid: true, paidAt: date(5) }), "Nov 1, 2026");
});

test("an unavailable base-currency valuation does not hide the original bill amount", () => {
  const text = formatExpenseAmount(
    { amount: 10000, bill: { state: "confirmed" }, money: { amountState: "unknown" } },
    "USD",
  );
  assert.match(text, /USD\s100\.00/);
  assert.match(text, /base valuation unavailable/);
  assert.doesNotMatch(text, /Amount unknown/);
});
