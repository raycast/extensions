/**
 * Golden Monetary & Temporal Contract Tests for Frihet Raycast Extension
 * (`Frihet-io/frihet-mcp#257` / `berthelius/frihet-distribution#10`).
 *
 * Enforces the 5 canonical rules:
 * 1. Absent != 0: `resolveDocumentAmount({})` returns `amount: null, provenance: "unavailable", unavailableCount: 1` (never `0 EUR`).
 * 2. Multi-currency separation: `sumProvenancedAmounts([100 EUR, 100 USD])` returns `amount: null, currency: "MIXED", provenance: "mixed_currency_unconverted"` (never `200 EUR`).
 * 3. Canonical discounts & taxes: `resolveDocumentAmount({ items: [{ quantity: 1, unitPrice: 100 }], discountRate: 10, taxRate: 0, irpfRate: 0 })` returns `90 EUR`, and fails closed to `unavailable` on unsupported modifiers (`pricesIncludeTax: true`, `compoundTaxes`, `prepayment`).
 * 4. Honest unpaid nominal wording: `realOutstandingBalanceDeterminable: false`, `unpaidNominalSemantics: "nominal_unpaid_invoice_totals_without_partial_payments"`, `unpaidNominalTotal`, `unpaidNominalTotalsByCurrency`, and Markdown label `Importe nominal de facturas no marcadas como pagadas (saldo pendiente real no determinable sin cobros parciales)`.
 * 5. Explicit temporal scope: `coverage.temporalScope === "unfiltered_operational_sample_as_of_date"` and `currentMonthActivity` (`referenceMonth: periodMonth`), explicitly separating the operational sample as of `asOfDate` from the current-month subset.
 */

import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  generateBusinessBrief,
  resolveDocumentAmount,
  sumProvenancedAmounts,
} from "../lib/business-brief-engine.js";

describe("Canonical Monetary & Temporal Brief Contract (Synced with Frihet-io/frihet-mcp#257)", () => {
  test("Golden Counterexample 1 (Absent != 0): resolveDocumentAmount({}) returns amount: null, provenance: 'unavailable', never 0 EUR", () => {
    const emptyDoc = resolveDocumentAmount({});
    assert.equal(emptyDoc.amount, null);
    assert.equal(emptyDoc.provenance, "unavailable");
    assert.equal(emptyDoc.unavailableCount, 1);

    // Explicit zero-price line item IS valid 0 EUR
    const explicitZero = resolveDocumentAmount({
      items: [{ quantity: 1, unitPrice: 0 }],
      taxRate: 21,
    });
    assert.equal(explicitZero.amount, 0);
    assert.equal(explicitZero.provenance, "derived_from_items");

    // Summing a valid amount with an unavailable amount marks the aggregate unavailable (never coercing missing doc to 0)
    const combined = sumProvenancedAmounts(
      [resolveDocumentAmount({ total: 100, currency: "EUR" }), emptyDoc],
      "EUR",
    );
    assert.equal(combined.amount, null);
    assert.equal(combined.provenance, "unavailable");
    assert.equal(combined.unavailableCount, 1);
    assert.equal(combined.totalsByCurrency?.EUR?.amount, 100);
  });

  test("Golden Counterexample 2 (Multi-currency separation): 100 EUR + 100 USD kept separate in totalsByCurrency and never summed into 200 EUR", () => {
    const multi = sumProvenancedAmounts(
      [
        resolveDocumentAmount({ total: 100, currency: "EUR" }),
        resolveDocumentAmount({ total: 100, currency: "USD" }),
      ],
      "EUR",
    );
    assert.equal(multi.amount, null);
    assert.equal(multi.currency, "MIXED");
    assert.equal(multi.provenance, "mixed_currency_unconverted");
    assert.equal(multi.totalsByCurrency?.EUR?.amount, 100);
    assert.equal(multi.totalsByCurrency?.EUR?.documentCount, 1);
    assert.equal(multi.totalsByCurrency?.USD?.amount, 100);
    assert.equal(multi.totalsByCurrency?.USD?.documentCount, 1);
  });

  test("Golden Counterexample 3 (Canonical discounts & taxes): applies document discountRate, line discount, equivalenceSurchargeRate, and irpfRate, and fails closed on unsupported modifiers", () => {
    // Reviewer's exact counterexample: 1 x 100 with discountRate: 10 -> 90 EUR
    const discounted = resolveDocumentAmount({
      items: [{ quantity: 1, unitPrice: 100 }],
      discountRate: 10,
      taxRate: 0,
      irpfRate: 0,
    });
    assert.equal(discounted.provenance, "derived_from_items");
    assert.equal(discounted.amount, 90);

    // Combined line discount (10%), document discount (5%), IVA (21%), RE (5.2%), IRPF (15%)
    const fullCanonical = resolveDocumentAmount({
      items: [{ quantity: 2, unitPrice: 100, discount: 10 }],
      discountRate: 5,
      taxRate: 21,
      equivalenceSurchargeRate: 5.2,
      irpfRate: 15,
    });
    assert.equal(fullCanonical.provenance, "derived_from_items");
    assert.equal(fullCanonical.amount, 190.15);

    // Unsupported modifiers without stored total fail closed to unavailable
    const unsupportedPricesIncludeTax = resolveDocumentAmount({
      items: [{ quantity: 1, unitPrice: 121 }],
      pricesIncludeTax: true,
      taxRate: 21,
    });
    assert.equal(unsupportedPricesIncludeTax.amount, null);
    assert.equal(unsupportedPricesIncludeTax.provenance, "unavailable");

    const unsupportedCompound = resolveDocumentAmount({
      items: [{ quantity: 1, unitPrice: 100 }],
      compoundTaxes: [{ rate: 5 }],
    });
    assert.equal(unsupportedCompound.amount, null);
    assert.equal(unsupportedCompound.provenance, "unavailable");

    const unsupportedPrepayment = resolveDocumentAmount({
      items: [{ quantity: 1, unitPrice: 100 }],
      prepayment: 25,
    });
    assert.equal(unsupportedPrepayment.amount, null);
    assert.equal(unsupportedPrepayment.provenance, "unavailable");
  });

  test("Honest unpaid nominal wording & explicit temporal scope separation in structure and Markdown", async () => {
    const brief = await generateBusinessBrief(
      {
        getBusinessContext: async () => ({
          company: {
            name: "Estudio Atlántico SL",
            currency: "EUR",
            taxRegime: "iva",
          },
          plan: { tier: "free" },
        }),
        listInvoices: async () => ({
          data: [
            {
              id: "inv_overdue_sept",
              invoiceNumber: "F20260000",
              clientName: "OpenAI Demo Sample Client",
              status: "overdue",
              issueDate: "2026-09-10",
              dueDate: "2026-10-10",
              total: 605,
              currency: "EUR",
            },
            {
              id: "inv_sent_oct",
              invoiceNumber: "F20260002",
              clientName: "Acme SL",
              status: "sent",
              issueDate: "2026-10-20",
              dueDate: "2026-11-20",
              total: 847,
              currency: "EUR",
            },
            {
              id: "inv_paid_oct",
              invoiceNumber: "F20260003",
              clientName: "Acme SL",
              status: "paid",
              issueDate: "2026-10-05",
              dueDate: "2026-10-20",
              total: 500,
              currency: "EUR",
            },
          ],
          total: 3,
          limit: 20,
          offset: 0,
        }),
        listQuotes: async () => ({ data: [], total: 0, limit: 20, offset: 0 }),
        listExpenses: async () => ({
          data: [
            {
              id: "exp_aug",
              description: "Office supplies",
              amount: 45.99,
              category: "office",
              vendor: "Office Depot Canarias",
              taxDeductible: false,
              date: "2026-08-28",
            },
            {
              id: "exp_oct",
              description: "Servidores QA octubre",
              amount: 121.0,
              category: "software",
              vendor: "Cloud Hosting QA",
              taxDeductible: true,
              date: "2026-10-27",
            },
          ],
          total: 2,
          limit: 20,
          offset: 0,
        }),
        listClients: async () => ({ data: [], total: 0, limit: 20, offset: 0 }),
        listClientActivities: async () => ({
          data: [],
          total: 0,
          limit: 10,
          offset: 0,
        }),
      },
      { asOfDate: "2026-10-28" },
    );

    assert.equal(
      brief.coverage.temporalScope,
      "unfiltered_operational_sample_as_of_date",
    );
    assert.equal(brief.coverage.referenceMonth, "2026-10");
    assert.equal(
      brief.activitySeparation.issuedActivity
        .realOutstandingBalanceDeterminable,
      false,
    );
    assert.equal(
      brief.activitySeparation.issuedActivity.unpaidNominalSemantics,
      "nominal_unpaid_invoice_totals_without_partial_payments",
    );
    assert.equal(
      brief.activitySeparation.issuedActivity.unpaidNominalTotal.amount,
      1452,
    );
    assert.equal(
      brief.activitySeparation.issuedActivity.unpaidNominalTotalsByCurrency.EUR
        ?.amount,
      1452,
    );

    // Operational sample (1952 EUR across 3 issued invoices) vs October subset (1347 EUR across 2 October issued invoices)
    assert.equal(
      brief.activitySeparation.issuedActivity.issuedInvoicesTotal.amount,
      1952,
    );
    assert.equal(
      brief.activitySeparation.currentMonthActivity.referenceMonth,
      "2026-10",
    );
    assert.equal(
      brief.activitySeparation.currentMonthActivity.issuedInvoicesInMonthCount,
      2,
    );
    assert.equal(
      brief.activitySeparation.currentMonthActivity.issuedInvoicesInMonthTotal
        .amount,
      1347,
    );
    assert.equal(
      brief.activitySeparation.currentMonthActivity.expensesInMonthCount,
      1,
    );
    assert.equal(
      brief.activitySeparation.currentMonthActivity.expensesInMonthTotal.amount,
      121,
    );

    assert.ok(
      brief.markdown.includes(
        "Corte operativo a 2026-10-28 · Muestra abierta/reciente sin filtro mensual",
      ),
    );
    assert.ok(
      brief.markdown.includes(
        "Importe nominal de facturas no marcadas como pagadas (saldo pendiente real no determinable sin cobros parciales)",
      ),
    );
  });
});
