/**
 * Contract Tests: BRIEF-01 — Native Raycast Business Brief Engine.
 *
 * Verifies:
 * 1. Complete Coverage (`isPartial: false`) vs Partial Multi-Page Sample (`isPartial: true`).
 * 2. Strict 4-way financial separation:
 *    - Drafts (`draft`) never mixed with Issued Revenue (`sent` + `overdue` + `paid`).
 *    - Recorded Paid (`paid`) separated from Nominal Unpaid (`sent` + `overdue`).
 *    - Nominal Unpaid split into `overdue` vs `onTime`.
 * 3. Non-deductible Expense Neutrality: `taxDeductible: false` with complete
 *    vendor/category is NEVER flagged as an error by default.
 * 4. Explicit amount provenance (`stored_field` vs `derived_from_items`) and zero writes.
 */

import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  BriefClientPort,
  generateOperationalBusinessBrief,
} from "../lib/business-brief-engine.js";

function buildCompleteQaWorkspaceClient(calls: string[]): BriefClientPort {
  return {
    getBusinessContext: async () => {
      calls.push("getBusinessContext");
      return {
        business: {
          name: "Frihet OpenAI Demo",
          currency: "EUR",
          fiscalZone: "canarias",
          country: "ES",
        },
        defaults: {
          taxRate: 7,
          dueDays: 15,
          currency: "EUR",
        },
        plan: {
          name: "free",
          invoices: { used: 4, limit: 999 },
          expenses: { used: 4, limit: 5 },
        },
      };
    },
    listInvoices: async () => {
      calls.push("listInvoices");
      return {
        data: [
          {
            id: "0avUIazQWeadR9NIXNOu",
            invoiceNumber: "F20260004",
            clientName: "Acme SL",
            status: "draft",
            issueDate: "2026-10-28",
            dueDate: "2026-11-12",
            taxRate: 21,
            total: 1210,
            currency: "EUR",
          },
          {
            id: "edeCSbfZtmpzx8q2S19s",
            invoiceNumber: "F20260001",
            clientName: "Acme SL",
            status: "draft",
            issueDate: "2026-10-08",
            dueDate: "2026-10-08",
            taxRate: 7,
            total: 535,
            currency: "EUR",
          },
          {
            id: "inv_overdue_qa",
            invoiceNumber: "F20260000",
            clientName: "OpenAI Demo Sample Client",
            status: "overdue",
            issueDate: "2026-09-10",
            dueDate: "2026-10-10",
            taxRate: 7,
            total: 605,
            currency: "EUR",
          },
          {
            id: "inv_sent_ontime_qa",
            invoiceNumber: "F20260005",
            clientName: "Acme SL",
            status: "sent",
            issueDate: "2026-10-20",
            dueDate: "2026-11-20",
            taxRate: 7,
            total: 847,
            currency: "EUR",
          },
          {
            id: "inv_paid_qa",
            invoiceNumber: "F20260006",
            clientName: "Acme SL",
            status: "paid",
            issueDate: "2026-10-01",
            dueDate: "2026-10-15",
            paidDate: "2026-10-12",
            taxRate: 7,
            total: 484,
            currency: "EUR",
          },
        ],
        total: 5,
        limit: 25,
        offset: 0,
      };
    },
    listQuotes: async () => {
      calls.push("listQuotes");
      return {
        data: [
          {
            id: "quo_draft_1",
            quoteNumber: "P20260001",
            clientName: "Acme SL",
            status: "draft",
            issueDate: "2026-10-25",
            total: 1210,
            currency: "EUR",
          },
        ],
        total: 1,
        limit: 25,
        offset: 0,
      };
    },
    listExpenses: async () => {
      calls.push("listExpenses");
      return {
        data: [
          {
            id: "jyaSd4KNgig9B5pGcsWP",
            description: "Office supplies",
            amount: 45.99,
            category: "office",
            date: "2026-08-28",
            vendor: "Office Depot Canarias",
            taxDeductible: false,
          },
          {
            id: "J5ICnB9lZMokSapUPByP",
            description: "Servidores QA octubre",
            amount: 121,
            category: "software",
            date: "2026-10-27",
            vendor: "Cloud Hosting QA",
            taxDeductible: true,
          },
        ],
        total: 2,
        limit: 25,
        offset: 0,
      };
    },
    listClients: async () => {
      calls.push("listClients");
      return {
        data: [
          {
            id: "444IZvNpVrtJhj5nRySW",
            name: "Acme SL",
            email: "contact@acme.example",
          },
          {
            id: "RCjuHqsCchF5ZCB7gU0s",
            name: "OpenAI Demo Sample Client",
            email: "demo@example.com",
          },
        ],
        total: 2,
        limit: 25,
        offset: 0,
      };
    },
    listClientActivities: async (clientId: string) => {
      calls.push(`listClientActivities:${clientId}`);
      if (clientId === "444IZvNpVrtJhj5nRySW") {
        return {
          data: [
            {
              id: "act_call_1",
              type: "call",
              title: "Follow-up call on Q4 retainer proposal",
              createdAt: "2026-10-28T01:18:39.677Z",
            },
          ],
          total: 1,
          limit: 5,
          offset: 0,
        };
      }
      return { data: [], total: 0, limit: 5, offset: 0 };
    },
  };
}

function buildPartialMultiPageWorkspaceClient(): BriefClientPort {
  return {
    getBusinessContext: async () => ({
      business: { name: "Distribuciones Insulares SL", currency: "EUR" },
      defaults: { taxRate: 21, currency: "EUR" },
      plan: { name: "pro" },
    }),
    listInvoices: async () => ({
      data: [
        {
          id: "inv_legacy_draft",
          invoiceNumber: "F20260047",
          clientName: "Logistica Norte SL",
          status: "draft",
          issueDate: "2026-10-27",
          items: [
            {
              description: "Consultoria logistica",
              quantity: 3,
              unitPrice: 100,
            },
          ],
          taxRate: 21,
        },
        {
          id: "inv_past_due_sent",
          invoiceNumber: "F20260046",
          clientName: "Maritima Sur SL",
          status: "sent",
          issueDate: "2026-09-15",
          dueDate: "2026-10-15",
          total: 2420,
        },
      ],
      total: 47,
      limit: 2,
      offset: 0,
      nextCursor: "cursor_inv_page_2",
    }),
    listQuotes: async () => ({ data: [], total: 0, limit: 2, offset: 0 }),
    listExpenses: async () => ({
      data: [
        {
          id: "exp_incomplete_1",
          description: "Combustible flota",
          amount: 88.5,
          category: "",
          vendor: "",
          taxDeductible: true,
          date: "2026-10-26",
        },
      ],
      total: 35,
      limit: 1,
      offset: 0,
      nextCursor: "cursor_exp_page_2",
    }),
    listClients: async () => ({
      data: [{ id: "cli_1", name: "Logistica Norte SL" }],
      total: 12,
      limit: 1,
      offset: 0,
    }),
    listClientActivities: async () => ({
      data: [],
      total: 0,
      limit: 5,
      offset: 0,
    }),
  };
}

describe("BRIEF-01 — Operational Business Brief Engine", () => {
  test("Scenario 1 (Complete Coverage): separates drafts, issued revenue, paid, and outstanding (overdue vs on-time), and does NOT flag non-deductible expenses as errors", async () => {
    const calls: string[] = [];
    const brief = await generateOperationalBusinessBrief(
      buildCompleteQaWorkspaceClient(calls),
      { asOfDate: "2026-10-28" },
    );

    assert.equal(brief.coverage.isPartial, false);
    assert.equal(
      brief.coverage.temporalScope,
      "unfiltered_operational_sample_as_of_date",
    );
    assert.equal(brief.coverage.referenceMonth, "2026-10");
    assert.match(brief.coverage.badgeLabel, /^Complete Coverage/u);

    // 1. Drafts strictly isolated from Issued Revenue
    assert.equal(brief.financials.drafts.invoiceDraftsCount, 2);
    assert.equal(brief.financials.drafts.invoiceDraftsTotal.amount, 1745);
    assert.equal(brief.financials.drafts.quoteDraftsCount, 1);
    assert.equal(brief.financials.drafts.quoteDraftsTotal.amount, 1210);

    // 2. Issued Revenue = sent (847) + overdue (605) + paid (484) = 1936
    assert.equal(brief.financials.issuedRevenue.count, 3);
    assert.equal(brief.financials.issuedRevenue.total.amount, 1936);

    // 3. Recorded Paid = 484
    assert.equal(brief.financials.recordedPaid.count, 1);
    assert.equal(brief.financials.recordedPaid.total.amount, 484);

    // 4. Outstanding Balance (nominal unpaid) = overdue (605) + on-time sent (847) = 1452
    assert.equal(
      brief.financials.outstandingBalance.realOutstandingBalanceDeterminable,
      false,
    );
    assert.equal(
      brief.financials.outstandingBalance.unpaidNominalSemantics,
      "nominal_unpaid_invoice_totals_without_partial_payments",
    );
    assert.equal(
      brief.financials.outstandingBalance.unpaidNominalTotal.amount,
      1452,
    );
    assert.equal(
      brief.financials.outstandingBalance.unpaidNominalTotalsByCurrency.EUR
        ?.amount,
      1452,
    );
    assert.equal(brief.financials.outstandingBalance.totalCount, 2);
    assert.equal(brief.financials.outstandingBalance.totalAmount.amount, 1452);
    assert.equal(brief.financials.outstandingBalance.overdueCount, 1);
    assert.equal(brief.financials.outstandingBalance.overdueAmount.amount, 605);
    assert.equal(brief.financials.outstandingBalance.onTimeCount, 1);
    assert.equal(brief.financials.outstandingBalance.onTimeAmount.amount, 847);

    // 5. Current Month (2026-10) subset separated from September overdue invoice (847 + 484 = 1331 EUR)
    assert.equal(
      brief.financials.currentMonthActivity.referenceMonth,
      "2026-10",
    );
    assert.equal(
      brief.financials.currentMonthActivity.issuedInvoicesInMonthCount,
      2,
    );
    assert.equal(
      brief.financials.currentMonthActivity.issuedInvoicesInMonthTotal.amount,
      1331,
    );
    assert.equal(
      brief.financials.currentMonthActivity.invoiceDraftsInMonthCount,
      2,
    );
    assert.equal(
      brief.financials.currentMonthActivity.invoiceDraftsInMonthTotal.amount,
      1745,
    );
    assert.equal(brief.financials.currentMonthActivity.expensesInMonthCount, 1);
    assert.equal(
      brief.financials.currentMonthActivity.expensesInMonthTotal.amount,
      121,
    );

    // 6. Non-deductible expense neutrality: `taxDeductible: false` with vendor & category is NOT flagged as incomplete
    assert.equal(brief.financials.expensesSummary.count, 2);
    assert.equal(brief.financials.expensesSummary.nonDeductibleCount, 1);
    assert.equal(brief.financials.expensesSummary.incompleteMetadataCount, 0);
    assert.equal(
      brief.reviewItems.some((item) => item.category === "incomplete_expense"),
      false,
      "Non-deductible expense with complete vendor/category must NOT be flagged as an error",
    );

    // Review items include overdue_invoice, draft_invoice, tax_discrepancy (21% vs 7%), crm_followup, plan_quota (4/5 = 80%)
    assert.deepEqual(
      brief.reviewItems.map((i) => i.category),
      [
        "overdue_invoice",
        "draft_invoice",
        "tax_discrepancy",
        "crm_followup",
        "plan_quota",
      ],
    );
    assert.equal(brief.mutationsExecuted, 0);
  });

  test("Scenario 2 (Partial Multi-Page Sample): discloses partial coverage, derives line-item totals when stored total is absent, and flags incomplete expense metadata", async () => {
    const brief = await generateOperationalBusinessBrief(
      buildPartialMultiPageWorkspaceClient(),
      { asOfDate: "2026-10-28", pageLimit: 2 },
    );

    assert.equal(brief.coverage.isPartial, true);
    assert.match(
      brief.coverage.badgeLabel,
      /^Partial Sample: 2\/47 inv · 1\/35 exp/u,
    );
    assert.match(
      brief.blindSpots[0] ?? "",
      /Partial workspace sample: inspected 2\/47 invoices/u,
    );

    // Legacy draft without stored total is derived from items (3 * 100 * 1.21 = 363)
    assert.equal(brief.financials.drafts.invoiceDraftsTotal.amount, 363);
    assert.equal(
      brief.financials.drafts.invoiceDraftsTotal.provenance,
      "derived_from_items",
    );

    // Past-due sent invoice (dueDate 2026-10-15 < 2026-10-28) is classified under overdue
    assert.equal(brief.financials.outstandingBalance.overdueCount, 1);
    assert.equal(
      brief.financials.outstandingBalance.overdueAmount.amount,
      2420,
    );

    // Expense missing vendor & category is flagged under incomplete_expense
    assert.equal(brief.financials.expensesSummary.incompleteMetadataCount, 1);
    assert.equal(
      brief.reviewItems.some((item) => item.category === "incomplete_expense"),
      true,
    );
  });
});
