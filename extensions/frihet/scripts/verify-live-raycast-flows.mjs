#!/usr/bin/env node
/**
 * Client-Only Live Verification Script for the Frihet Raycast Extension (`berthelius/frihet-distribution#10`).
 *
 * Security & Separation of Concerns:
 * - This script lives inside the user extension repository (`berthelius/frihet-raycast`) and uses
 *   strictly the public HTTPS client (`https://api.frihet.io/v1`).
 * - It consumes only standard `fri_...` API keys passed via environment variables:
 *   - `FRIHET_QA_WORKSPACE_A_API_KEY` (Synthetic Workspace A — e.g. "Frihet OpenAI Demo")
 *   - `FRIHET_QA_WORKSPACE_B_API_KEY` (Synthetic Workspace B — e.g. "Viktor Demo")
 * - Provisioning and post-test revocation of temporary QA API keys belong exclusively to the external
 *   authorized QA harness (`frihet-distribution/activation-2026-10-28/raycast-qa-harness.mjs`).
 */

import assert from "node:assert/strict";
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  buildFrihetDeepLink,
  FrihetApiError,
  FrihetRaycastClient,
} from "../dist/lib/frihet-client.js";
import { generateBusinessBrief } from "../dist/lib/business-brief-engine.js";
import { WorkspaceRegistry } from "../dist/lib/tenant-cache.js";

const ROOT = fileURLToPath(new URL("../", import.meta.url));
const RECEIPT_PATH = process.env.FRIHET_RAYCAST_RECEIPT_PATH
  ? resolve(process.env.FRIHET_RAYCAST_RECEIPT_PATH)
  : resolve(ROOT, "live-verification-receipt.json");
const API_BASE_URL = process.env.FRIHET_API_BASE_URL?.trim() || "https://api.frihet.io/v1";

async function verifyDeepLinkTargetReachable(url) {
  const res = await fetch(url, {
    method: "GET",
    redirect: "follow",
    headers: {
      Accept: "text/html,application/xhtml+xml",
    },
  });
  const html = await res.text();
  return {
    url,
    httpStatus: res.status,
    ok: res.status === 200,
    contentType: res.headers.get("content-type") || "",
    hasAppRootShell: html.includes('<div id="root">') || html.includes("Frihet"),
  };
}

export async function runLiveVerification({
  apiKeyA = process.env.FRIHET_QA_WORKSPACE_A_API_KEY?.trim() || "",
  apiKeyB = process.env.FRIHET_QA_WORKSPACE_B_API_KEY?.trim() || "",
  writeReceipt = true,
} = {}) {
  if (!apiKeyA || !apiKeyB) {
    throw new Error(
      "Missing FRIHET_QA_WORKSPACE_A_API_KEY or FRIHET_QA_WORKSPACE_B_API_KEY. Provide two distinct synthetic workspace API keys (fri_...).",
    );
  }
  assert.notEqual(
    apiKeyA,
    apiKeyB,
    "Workspace A and Workspace B must use distinct API keys bound to two separate synthetic companies.",
  );

  const startedAt = new Date().toISOString();
  const registry = new WorkspaceRegistry();

  const clientA = new FrihetRaycastClient({
    apiKey: apiKeyA,
    apiBaseUrl: API_BASE_URL,
    cache: registry,
  });

  // ------------------------------------------------------------------
  // 1. Live Connection & getBusinessContext (Workspace A)
  // ------------------------------------------------------------------
  const contextA = await clientA.getBusinessContext();
  const workspaceAName = contextA.business?.name ?? contextA.company?.name ?? "";
  assert.ok(workspaceAName.length > 0, "Expected non-empty workspace name for Workspace A from GET /v1/context");

  const flow1ContextReceipt = {
    status: "PASSED",
    endpoint: `${API_BASE_URL}/context`,
    workspaceName: workspaceAName,
    currency: contextA.business?.currency ?? contextA.company?.currency ?? contextA.defaults?.currency ?? "EUR",
    fiscalZone: contextA.business?.fiscalZone ?? contextA.company?.taxRegime ?? null,
    planTier: contextA.plan?.name ?? contextA.plan?.tier ?? "free",
    tenantNamespace: clientA.tenantNamespace,
  };

  // ------------------------------------------------------------------
  // 2. Live generateBusinessBrief (Monetary & Temporal Contract on Workspace A)
  // ------------------------------------------------------------------
  const briefA = await generateBusinessBrief(clientA, {
    asOfDate: "2026-10-28",
    pageLimit: 25,
  });
  assert.equal(briefA.coverage.temporalScope, "unfiltered_operational_sample_as_of_date");
  assert.equal(briefA.coverage.referenceMonth, "2026-10");
  assert.equal(briefA.activitySeparation.issuedActivity.realOutstandingBalanceDeterminable, false);
  assert.equal(
    briefA.activitySeparation.issuedActivity.unpaidNominalSemantics,
    "nominal_unpaid_invoice_totals_without_partial_payments",
  );
  assert.equal(briefA.mutationsExecuted, 0);
  assert.ok(
    briefA.markdown.includes(
      "Importe nominal de facturas no marcadas como pagadas (saldo pendiente real no determinable sin cobros parciales)",
    ),
  );

  const flow2BriefReceipt = {
    status: "PASSED",
    question: briefA.question,
    asOfDate: briefA.coverage.asOfDate,
    referenceMonth: briefA.coverage.referenceMonth,
    temporalScope: briefA.coverage.temporalScope,
    isPartial: briefA.coverage.isPartial,
    resources: briefA.coverage.resources,
    draftActivity: {
      invoiceDraftsCount: briefA.activitySeparation.draftActivity.invoiceDraftsCount,
      invoiceDraftsTotal: briefA.activitySeparation.draftActivity.invoiceDraftsTotal,
      quoteDraftsCount: briefA.activitySeparation.draftActivity.quoteDraftsCount,
      quoteDraftsTotal: briefA.activitySeparation.draftActivity.quoteDraftsTotal,
    },
    issuedActivity: {
      realOutstandingBalanceDeterminable:
        briefA.activitySeparation.issuedActivity.realOutstandingBalanceDeterminable,
      unpaidNominalSemantics: briefA.activitySeparation.issuedActivity.unpaidNominalSemantics,
      issuedInvoicesCount: briefA.activitySeparation.issuedActivity.issuedInvoicesCount,
      issuedInvoicesTotal: briefA.activitySeparation.issuedActivity.issuedInvoicesTotal,
      paidInvoicesCount: briefA.activitySeparation.issuedActivity.paidInvoicesCount,
      paidInvoicesTotal: briefA.activitySeparation.issuedActivity.paidInvoicesTotal,
      unpaidNominalInvoicesCount:
        briefA.activitySeparation.issuedActivity.unpaidNominalInvoicesCount,
      unpaidNominalTotal: briefA.activitySeparation.issuedActivity.unpaidNominalTotal,
      unpaidNominalTotalsByCurrency:
        briefA.activitySeparation.issuedActivity.unpaidNominalTotalsByCurrency,
    },
    recordedExpenses: {
      expensesCount: briefA.activitySeparation.recordedExpenses.expensesCount,
      expensesTotal: briefA.activitySeparation.recordedExpenses.expensesTotal,
      deductibleCount: briefA.activitySeparation.recordedExpenses.deductibleCount,
      nonDeductibleCount: briefA.activitySeparation.recordedExpenses.nonDeductibleCount,
      pendingReviewCount: briefA.activitySeparation.recordedExpenses.pendingReviewCount,
    },
    currentMonthActivity: briefA.activitySeparation.currentMonthActivity,
    reviewItemsCount: briefA.reviewItems.length,
    reviewCategories: briefA.reviewItems.map((i) => i.category),
    mutationsExecuted: briefA.mutationsExecuted,
  };

  // ------------------------------------------------------------------
  // 3. Live Search Flows: listInvoices, listClients, listProducts + Deep Link Target Probe
  // ------------------------------------------------------------------
  const [invoicesPageA, clientsPageA, productsResultA] = await Promise.all([
    clientA.listInvoices({ limit: 10 }),
    clientA.listClients({ limit: 10 }),
    clientA.listProducts({ isActive: true, limit: 10 }),
  ]);

  let detailedInvoiceSampleA = null;
  let invoiceDeepLinkCheck = null;
  if (invoicesPageA.data.length > 0) {
    const firstId = invoicesPageA.data[0].id;
    const detailed = await clientA.getInvoice(firstId);
    const deepLinkUrl = buildFrihetDeepLink("invoices", detailed.id);
    invoiceDeepLinkCheck = await verifyDeepLinkTargetReachable(deepLinkUrl);
    assert.equal(invoiceDeepLinkCheck.ok, true, "Expected deep-link route to return HTTP 200");
    detailedInvoiceSampleA = {
      id: detailed.id,
      invoiceNumber: detailed.invoiceNumber ?? detailed.documentNumber ?? detailed.id,
      status: detailed.status ?? "draft",
      clientName: detailed.clientName,
      itemCount: Array.isArray(detailed.items) ? detailed.items.length : 0,
      deepLinkUrl,
      deepLinkTargetProbe: invoiceDeepLinkCheck,
    };
  }

  const flow3SearchReceipt = {
    status: "PASSED",
    invoices: {
      inspected: invoicesPageA.data.length,
      total: invoicesPageA.total,
      sampleIds: invoicesPageA.data.slice(0, 5).map((i) => i.id),
      detailedInvoiceSample: detailedInvoiceSampleA,
      openInFrihetUrl: buildFrihetDeepLink("invoices"),
    },
    clients: {
      inspected: clientsPageA.data.length,
      total: clientsPageA.total,
      sampleNames: clientsPageA.data.slice(0, 5).map((c) => ({ id: c.id, name: c.name })),
      openInFrihetUrl: buildFrihetDeepLink("clients"),
    },
    products: {
      inspected: productsResultA.data.length,
      total: productsResultA.total,
      usedClientSideFallback: productsResultA.usedClientSideFallback,
      fallbackCoveragePartial: productsResultA.fallbackCoveragePartial,
      fallbackReason: productsResultA.fallbackReason ?? null,
      sampleProducts: productsResultA.data.slice(0, 5).map((p) => ({
        id: p.id,
        name: p.name,
        unitPrice: p.unitPrice,
        isActive: p.isActive ?? null,
      })),
      openInFrihetUrl: buildFrihetDeepLink("products"),
    },
  };

  // ------------------------------------------------------------------
  // 4. Two-Company Workspace Switch (Workspace A -> Workspace B with Pending Request)
  // ------------------------------------------------------------------
  const statsBeforeSwitch = registry.getStats();
  assert.ok(statsBeforeSwitch.cachedEntryCount > 0, "Expected Workspace A cache entries before switch");

  let workspaceAInFlightAborted = false;
  const slowClientA = new FrihetRaycastClient({
    apiKey: apiKeyA,
    apiBaseUrl: API_BASE_URL,
    cache: registry,
    fetchImpl: async (_url, init) =>
      new Promise((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => {
          workspaceAInFlightAborted = true;
          reject(init.signal.reason ?? new Error("Aborted"));
        });
      }),
  });

  const pendingPromiseA = slowClientA.listInvoices({ q: "in-flight-before-switch", bypassCache: true });

  // Activate Workspace B (distinct second synthetic company) on the shared WorkspaceRegistry
  const clientB = new FrihetRaycastClient({
    apiKey: apiKeyB,
    apiBaseUrl: API_BASE_URL,
    cache: registry,
  });
  assert.notEqual(
    clientB.tenantNamespace,
    clientA.tenantNamespace,
    "Workspace B must derive a distinct tenant namespace from Workspace A",
  );

  await assert.rejects(
    pendingPromiseA,
    (err) => err instanceof FrihetApiError && err.errorCode === "request_aborted",
  );

  const statsImmediatelyAfterSwitch = registry.getStats();
  const staleEntryFromWorkspaceA = registry.get(clientA.tenantNamespace, "context");
  assert.equal(staleEntryFromWorkspaceA, undefined, "Zero stale records from Workspace A may remain accessible");
  assert.equal(statsImmediatelyAfterSwitch.cachedEntryCount, 0, "Cache must be empty right after switching");
  assert.ok(
    statsImmediatelyAfterSwitch.generation > statsBeforeSwitch.generation,
    "Cache generation must increment on workspace switch",
  );

  const [contextB, invoicesPageB, clientsPageB] = await Promise.all([
    clientB.getBusinessContext(),
    clientB.listInvoices({ limit: 10 }),
    clientB.listClients({ limit: 10 }),
  ]);

  const workspaceBName = contextB.business?.name ?? contextB.company?.name ?? "";
  assert.ok(workspaceBName.length > 0, "Expected non-empty workspace name for Workspace B from live GET /v1/context");
  assert.notEqual(
    workspaceBName,
    workspaceAName,
    `Expected two distinct synthetic companies, got "${workspaceAName}" and "${workspaceBName}"`,
  );

  const invoiceIdsA = new Set(invoicesPageA.data.map((i) => i.id));
  const overlappingInvoiceIds = invoicesPageB.data.map((i) => i.id).filter((id) => invoiceIdsA.has(id));
  assert.equal(overlappingInvoiceIds.length, 0, "Workspace A and Workspace B invoice sets must be disjoint");

  const clientIdsA = new Set(clientsPageA.data.map((c) => c.id));
  const overlappingClientIds = clientsPageB.data.map((c) => c.id).filter((id) => clientIdsA.has(id));
  assert.equal(overlappingClientIds.length, 0, "Workspace A and Workspace B client sets must be disjoint");

  const flow4SwitchReceipt = {
    status: "PASSED",
    twoDistinctCompaniesVerified: true,
    workspaceA: {
      companyName: workspaceAName,
      fiscalZone: contextA.business?.fiscalZone ?? contextA.company?.taxRegime ?? null,
      tenantNamespace: clientA.tenantNamespace,
      invoiceIds: invoicesPageA.data.map((i) => i.id),
      clientNames: clientsPageA.data.map((c) => c.name),
    },
    workspaceB: {
      companyName: workspaceBName,
      fiscalZone: contextB.business?.fiscalZone ?? contextB.company?.taxRegime ?? null,
      tenantNamespace: clientB.tenantNamespace,
      invoiceIds: invoicesPageB.data.map((i) => i.id),
      clientNames: clientsPageB.data.map((c) => c.name),
    },
    generationBeforeSwitch: statsBeforeSwitch.generation,
    cachedEntriesBeforeSwitch: statsBeforeSwitch.cachedEntryCount,
    generationAfterSwitch: statsImmediatelyAfterSwitch.generation,
    cachedEntriesImmediatelyAfterSwitch: statsImmediatelyAfterSwitch.cachedEntryCount,
    inFlightRequestAbortedOnSwitch: workspaceAInFlightAborted,
    staleWorkspaceAContextRemaining: staleEntryFromWorkspaceA !== undefined,
    overlappingInvoiceIds,
    overlappingClientIds,
  };

  const receipt = {
    schemaVersion: 2,
    issue: "berthelius/frihet-distribution#10",
    verifiedAt: new Date().toISOString(),
    startedAt,
    apiBaseUrl: API_BASE_URL,
    flows: {
      flow1_connectionAndContext: flow1ContextReceipt,
      flow2_businessBriefMonetaryAndTemporalContract: flow2BriefReceipt,
      flow3_searchInvoicesClientsProductsAndDeepLinks: flow3SearchReceipt,
      flow4_twoCompanyWorkspaceSwitchAndCacheIsolation: flow4SwitchReceipt,
    },
  };

  if (writeReceipt) {
    writeFileSync(RECEIPT_PATH, `${JSON.stringify(receipt, null, 2)}\n`, "utf8");
    console.log(`Live verification succeeded. Receipt written to ${RECEIPT_PATH}`);
  }
  return receipt;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runLiveVerification().catch((err) => {
    console.error("Live verification failed:", err instanceof Error ? err.message : String(err));
    process.exit(1);
  });
}
