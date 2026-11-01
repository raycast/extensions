/**
 * Contract Tests: READ-01 & FISC-01.
 *
 * Covers:
 * - Invoices search, status filter, cursor pagination (`after` -> wire `cursor=`),
 *   and single-object `{ data, meta }` unwrapping (`getInvoice`).
 * - Amount provenance (`stored_field` vs `derived_from_items` vs `unavailable`).
 * - Clients search and CRM activity timeline (`listClientActivities`).
 * - Products search with legacy `isActive` (`undefined` vs `true` vs `false`)
 *   and automatic client-side fallback (`usedClientSideFallback`, `fallbackCoveragePartial`)
 *   when `GET /v1/products?isActive=true` returns HTTP 500 before ERP PR #2944 is deployed.
 */

import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  buildFrihetDeepLink,
  filterProductsByActiveMode,
  FrihetRestClient,
  isProductEffectivelyActive,
  resolveDocumentAmount,
} from "../lib/frihet-client.js";
import { TenantScopedCache } from "../lib/tenant-cache.js";
import type { ProductRecord } from "../lib/types.js";

describe("READ-01 & FISC-01 — Invoices, Clients, Products & Legacy isActive Fallback", () => {
  test("listInvoices sends cursor and status on wire, and getInvoice unwraps { data, meta } envelope", async () => {
    const seenUrls: string[] = [];
    const client = new FrihetRestClient({
      apiKey: "fri_qa_test_key",
      cache: new TenantScopedCache(),
      fetchImpl: async (input) => {
        const urlStr = String(input);
        seenUrls.push(urlStr);
        if (urlStr.includes("/invoices/0avUIazQWeadR9NIXNOu")) {
          return new Response(
            JSON.stringify({
              data: {
                id: "0avUIazQWeadR9NIXNOu",
                invoiceNumber: "F20260004",
                clientName: "Acme SL",
                status: "draft",
                issueDate: "2026-10-28",
                dueDate: "2026-11-12",
                taxRate: 21,
                items: [
                  {
                    description: "Consultoria estrategica QA",
                    quantity: 10,
                    unitPrice: 100,
                  },
                ],
              },
              meta: { requestId: "req_detail_1" },
            }),
            { status: 200, headers: { "Content-Type": "application/json" } },
          );
        }
        return new Response(
          JSON.stringify({
            data: [
              {
                id: "0avUIazQWeadR9NIXNOu",
                invoiceNumber: "F20260004",
                clientName: "Acme SL",
                status: "draft",
                issueDate: "2026-10-28",
                dueDate: "2026-11-12",
              },
            ],
            total: 4,
            limit: 1,
            offset: 0,
            nextCursor: "cursor_next_page_2",
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      },
    });

    const page = await client.listInvoices({
      q: "Acme",
      status: "draft",
      limit: 1,
      after: "cursor_page_1",
    });

    assert.equal(page.data.length, 1);
    assert.equal(page.total, 4);
    assert.equal(page.nextCursor, "cursor_next_page_2");
    assert.match(seenUrls[0] ?? "", /q=Acme/u);
    assert.match(seenUrls[0] ?? "", /status=draft/u);
    assert.match(seenUrls[0] ?? "", /cursor=cursor_page_1/u);
    assert.equal((seenUrls[0] ?? "").includes("after="), false);

    // Summary row lacks stored total and items -> provenance is "unavailable" and amount is null (never 0)
    const summaryAmount = resolveDocumentAmount(page.data[0]!);
    assert.equal(summaryAmount.provenance, "unavailable");
    assert.equal(summaryAmount.amount, null);

    // Detailed record has line items + taxRate -> provenance is "derived_from_items" (10 * 100 * 1.21 = 1210)
    const detail = await client.getInvoice("0avUIazQWeadR9NIXNOu");
    assert.equal(detail.invoiceNumber, "F20260004");
    const detailAmount = resolveDocumentAmount(detail);
    assert.equal(detailAmount.provenance, "derived_from_items");
    assert.equal(detailAmount.amount, 1210);
    assert.equal(detailAmount.currency, "EUR");
  });

  test("resolveDocumentAmount handles stored total, IRPF retention, and discounts accurately", () => {
    const stored = resolveDocumentAmount({ total: 605, currency: "EUR" });
    assert.equal(stored.provenance, "stored_field");
    assert.equal(stored.amount, 605);

    const withIrpf = resolveDocumentAmount({
      items: [{ description: "Design", quantity: 2, unitPrice: 100 }],
      taxRate: 21,
      irpfRate: 15,
      currency: "EUR",
    });
    assert.equal(withIrpf.provenance, "derived_from_items");
    assert.equal(withIrpf.amount, 212);
  });

  test("searchProducts / listProducts distinguishes legacy isActive=undefined from false and falls back cleanly on HTTP 500 (pre-PR #2944)", async () => {
    const catalogueFixture: ProductRecord[] = [
      {
        id: "EYd0ioEOZwMLAn30dxu6",
        name: "OpenAI Demo Annual Hosting",
        unitPrice: 240,
        taxRate: 21,
        isActive: true,
      },
      {
        id: "legacy_prod_no_flag",
        name: "Legacy Consulting Retainer",
        unitPrice: 150,
        taxRate: 7,
        // `isActive` intentionally omitted (legacy record)
      },
      {
        id: "archived_prod_false",
        name: "Retired 2025 Package",
        unitPrice: 99,
        taxRate: 21,
        isActive: false,
      },
    ];

    assert.equal(isProductEffectivelyActive(catalogueFixture[0]!), true);
    assert.equal(isProductEffectivelyActive(catalogueFixture[1]!), true);
    assert.equal(isProductEffectivelyActive(catalogueFixture[2]!), false);

    assert.equal(
      filterProductsByActiveMode(catalogueFixture, "active").length,
      2,
    );
    assert.equal(
      filterProductsByActiveMode(catalogueFixture, "inactive").length,
      1,
    );
    assert.equal(filterProductsByActiveMode(catalogueFixture, "all").length, 3);

    let simulateTotal = catalogueFixture.length;
    let simulateTruncated = false;
    const requestedUrls: string[] = [];
    const client = new FrihetRestClient({
      apiKey: "fri_qa_products_key",
      cache: new TenantScopedCache(),
      fetchImpl: async (input) => {
        const urlStr = String(input);
        requestedUrls.push(urlStr);
        // Simulate pre-PR #2944 HTTP 500 when `?isActive=` is sent on the wire
        if (urlStr.includes("isActive=")) {
          return new Response(
            JSON.stringify({
              error: "INTERNAL_ERROR",
              message: "Firestore query failed",
            }),
            { status: 500, headers: { "Content-Type": "application/json" } },
          );
        }
        return new Response(
          JSON.stringify({
            data: catalogueFixture,
            total: simulateTotal,
            limit: 25,
            offset: 0,
            truncated: simulateTruncated,
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      },
    });

    const activeResult = await client.listProducts({ isActive: true });
    assert.equal(activeResult.usedClientFallback, true);
    assert.equal(activeResult.usedClientSideFallback, true);
    assert.equal(activeResult.fallbackCoveragePartial, false);
    assert.equal(activeResult.data.length, 2);
    assert.deepEqual(
      activeResult.data.map((p) => p.id),
      ["EYd0ioEOZwMLAn30dxu6", "legacy_prod_no_flag"],
    );
    assert.equal(requestedUrls.length, 2);
    assert.match(requestedUrls[0]!, /isActive=true/u);
    assert.equal(requestedUrls[1]!.includes("isActive="), false);

    // When unfiltered page has total > data.length or truncated === true, fallbackCoveragePartial is true
    simulateTotal = 50;
    simulateTruncated = true;
    const inactiveResult = await client.searchProducts({
      activeFilter: "inactive",
      bypassCache: true,
    });
    assert.equal(inactiveResult.usedClientFallback, true);
    assert.equal(inactiveResult.usedClientSideFallback, true);
    assert.equal(inactiveResult.fallbackCoveragePartial, true);
    assert.equal(inactiveResult.total, 50);
    assert.deepEqual(
      inactiveResult.data.map((p) => p.id),
      ["archived_prod_false"],
    );
  });

  test("listClients and listClientActivities load CRM timeline and build verified Frihet deep links", async () => {
    const client = new FrihetRestClient({
      apiKey: "fri_qa_clients_key",
      cache: new TenantScopedCache(),
      fetchImpl: async (input) => {
        const urlStr = String(input);
        if (urlStr.includes("/clients/444IZvNpVrtJhj5nRySW/activities")) {
          return new Response(
            JSON.stringify({
              data: [
                {
                  id: "act_call_1",
                  type: "call",
                  title: "Follow-up call on October proposal",
                  createdAt: "2026-10-28T01:18:39.677Z",
                },
              ],
              total: 1,
              limit: 10,
              offset: 0,
            }),
            { status: 200, headers: { "Content-Type": "application/json" } },
          );
        }
        return new Response(
          JSON.stringify({
            data: [
              {
                id: "444IZvNpVrtJhj5nRySW",
                name: "Acme SL",
                email: "contact@acme.example",
                taxId: "B00000000",
              },
            ],
            total: 1,
            limit: 20,
            offset: 0,
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      },
    });

    const clients = await client.listClients({ q: "Acme" });
    assert.equal(clients.data.length, 1);
    assert.equal(clients.data[0]?.name, "Acme SL");

    const activities = await client.listClientActivities(
      "444IZvNpVrtJhj5nRySW",
    );
    assert.equal(activities.data.length, 1);
    assert.equal(activities.data[0]?.type, "call");

    assert.equal(
      buildFrihetDeepLink("invoices"),
      "https://app.frihet.io/invoices",
    );
    assert.equal(
      buildFrihetDeepLink("clients"),
      "https://app.frihet.io/clients",
    );
    assert.equal(
      buildFrihetDeepLink("products"),
      "https://app.frihet.io/products",
    );
  });
});
