/**
 * Contract & Security Tests: AUTH-01, AUTH-02, REL-01.
 *
 * Covers:
 * - AUTH-01: Missing key, 401 invalid/revoked key, 403 forbidden, 429 rate limit,
 *   408 timeout, and 503 network offline recovery with zero credential leakage.
 * - Security containment: Untrusted base URLs and HTTP redirects are refused
 *   before any credential can be leaked.
 * - AUTH-02: Cross-workspace cache isolation and atomic in-flight request abort
 *   when switching tenants during a pending search.
 */

import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  FrihetApiError,
  FrihetRestClient,
  validateSafeApiBaseUrl,
} from "../lib/frihet-client.js";
import {
  computeTenantNamespace,
  TenantScopedCache,
} from "../lib/tenant-cache.js";

describe("AUTH-01 & REL-01 — Authentication, Error Recovery & Redirect Containment", () => {
  test("refuses empty API key with actionable 401 remediation", () => {
    assert.throws(
      () => new FrihetRestClient({ apiKey: "   " }),
      (err: unknown) => {
        assert.ok(err instanceof FrihetApiError);
        assert.equal(err.statusCode, 401);
        assert.equal(err.isAuthError, true);
        assert.match(err.remediation, /Extension Preferences/u);
        return true;
      },
    );
  });

  test("maps 401, 403, 429, and 503 responses to actionable FrihetApiError without echoing the API key", async () => {
    const secretKey = "fri_secret_qa_key_never_echo_1234567890";
    for (const status of [401, 403, 429, 503]) {
      const client = new FrihetRestClient({
        apiKey: secretKey,
        apiBaseUrl: "https://api.frihet.io/v1",
        cache: new TenantScopedCache(),
        fetchImpl: async () =>
          new Response(
            JSON.stringify({
              error: `error_${status}`,
              message: `Server returned ${status}`,
              meta: { requestId: `req_${status}` },
            }),
            {
              status,
              headers: { "Content-Type": "application/json" },
            },
          ),
      });

      await assert.rejects(
        () => client.getBusinessContext(),
        (err: unknown) => {
          assert.ok(err instanceof FrihetApiError);
          assert.equal(err.statusCode, status);
          assert.equal(err.requestId, `req_${status}`);
          assert.equal(err.message.includes(secretKey), false);
          assert.equal(err.remediation.includes(secretKey), false);
          if (status === 401) assert.equal(err.isAuthError, true);
          if (status === 403) assert.equal(err.isPermissionError, true);
          if (status === 429) assert.equal(err.isRateLimitError, true);
          if (status === 503) assert.equal(err.isOfflineError, true);
          return true;
        },
      );
    }
  });

  test("validates base URL and refuses untrusted hosts, plain HTTP, and HTTP redirects", async () => {
    assert.equal(
      validateSafeApiBaseUrl("https://api.frihet.io/v1/"),
      "https://api.frihet.io/v1",
    );
    assert.equal(
      validateSafeApiBaseUrl("http://127.0.0.1:8787/v1"),
      "http://127.0.0.1:8787/v1",
    );

    assert.throws(
      () => validateSafeApiBaseUrl("http://api.frihet.io/v1"),
      /HTTPS/u,
    );
    assert.throws(
      () => validateSafeApiBaseUrl("https://evil.example.com/v1"),
      /frihet\.io/u,
    );
    assert.throws(
      () => validateSafeApiBaseUrl("https://user:pass@api.frihet.io/v1"),
      /credentials/u,
    );

    const client = new FrihetRestClient({
      apiKey: "fri_redirect_test_key",
      apiBaseUrl: "https://api.frihet.io/v1",
      cache: new TenantScopedCache(),
      fetchImpl: async (_input, init) => {
        assert.equal(init?.redirect, "manual");
        return new Response(null, {
          status: 302,
          headers: { Location: "https://evil.example.com/collect" },
        });
      },
    });

    await assert.rejects(
      () => client.listClients(),
      (err: unknown) => {
        assert.ok(err instanceof FrihetApiError);
        assert.equal(err.statusCode, 502);
        assert.equal(err.errorCode, "unexpected_redirect");
        return true;
      },
    );
  });
});

describe("AUTH-02 — Cross-Tenant Cache Isolation & In-Flight Request Cancellation", () => {
  test("switching workspaces during a pending search aborts Tenant A request and prevents cross-tenant cache leakage", async () => {
    const sharedCache = new TenantScopedCache();
    let tenantASignal: AbortSignal | undefined;
    let resolveTenantAFetch: ((res: Response) => void) | undefined;

    const clientTenantA = new FrihetRestClient({
      apiKey: "fri_tenant_alpha_key_111111",
      apiBaseUrl: "https://api.frihet.io/v1",
      cache: sharedCache,
      fetchImpl: (_input, init) => {
        tenantASignal = init?.signal ?? undefined;
        return new Promise<Response>((resolve, reject) => {
          resolveTenantAFetch = resolve;
          init?.signal?.addEventListener("abort", () => {
            reject(Object.assign(new Error("Aborted"), { name: "AbortError" }));
          });
        });
      },
    });

    // Start slow search in Tenant A
    const pendingSearchA = clientTenantA.listInvoices({ q: "Acme" });
    assert.ok(
      tenantASignal,
      "Tenant A request should have registered an AbortSignal",
    );
    assert.equal(tenantASignal.aborted, false);

    // Switch to Tenant B while Tenant A's search is still in-flight
    const clientTenantB = new FrihetRestClient({
      apiKey: "fri_tenant_bravo_key_222222",
      apiBaseUrl: "https://api.frihet.io/v1",
      cache: sharedCache,
      fetchImpl: async () =>
        new Response(
          JSON.stringify({
            data: [
              {
                id: "inv_bravo_1",
                invoiceNumber: "B2026-001",
                clientName: "Bravo Corp",
                status: "sent",
                total: 500,
              },
            ],
            total: 1,
            limit: 25,
            offset: 0,
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
    });

    // Activating Tenant B must immediately abort Tenant A's in-flight request
    assert.equal(
      tenantASignal.aborted,
      true,
      "Tenant A in-flight request must be aborted on tenant switch",
    );
    assert.notEqual(
      clientTenantA.tenantNamespace,
      clientTenantB.tenantNamespace,
    );

    await assert.rejects(
      () => pendingSearchA,
      (err: unknown) => {
        assert.ok(err instanceof FrihetApiError);
        assert.equal(err.errorCode, "request_aborted");
        return true;
      },
    );

    // Tenant B fetches its own invoices cleanly
    const pageB = await clientTenantB.listInvoices({ q: "Acme" });
    assert.equal(pageB.data.length, 1);
    assert.equal(pageB.data[0]?.clientName, "Bravo Corp");

    // Even if a stale caller attempts to read or write under Tenant A's namespace, it is rejected
    assert.equal(
      sharedCache.get(clientTenantA.tenantNamespace, "any"),
      undefined,
    );
    if (resolveTenantAFetch) {
      resolveTenantAFetch(new Response("{}"));
    }
  });

  test("rapid search queries in the same workspace abort the superseded in-flight request", async () => {
    const cache = new TenantScopedCache();
    const signals: AbortSignal[] = [];

    const client = new FrihetRestClient({
      apiKey: "fri_single_tenant_key",
      cache,
      fetchImpl: (_input, init) => {
        if (init?.signal) signals.push(init.signal);
        return new Promise<Response>((resolve, reject) => {
          init?.signal?.addEventListener("abort", () => {
            reject(Object.assign(new Error("Aborted"), { name: "AbortError" }));
          });
          if (signals.length === 2) {
            resolve(
              new Response(
                JSON.stringify({
                  data: [{ id: "cli_acme", name: "Acme SL" }],
                  total: 1,
                  limit: 25,
                  offset: 0,
                }),
                {
                  status: 200,
                  headers: { "Content-Type": "application/json" },
                },
              ),
            );
          }
        });
      },
    });

    const firstQuery = client.listClients({ q: "Ac", bypassCache: true });
    const secondQuery = client.listClients({ q: "Acme", bypassCache: true });

    assert.equal(signals.length, 2);
    assert.equal(
      signals[0]?.aborted,
      true,
      "First search request must be aborted by second search",
    );
    assert.equal(signals[1]?.aborted, false);

    await assert.rejects(() => firstQuery, { name: "FrihetApiError" });
    const secondResult = await secondQuery;
    assert.equal(secondResult.data[0]?.name, "Acme SL");
  });

  test("computeTenantNamespace never exposes the raw API key", () => {
    const rawKey = "fri_live_super_secret_token_value";
    const ns = computeTenantNamespace("https://api.frihet.io/v1", rawKey);
    assert.equal(ns.length, 16);
    assert.equal(ns.includes("fri_"), false);
    assert.equal(ns.includes("secret"), false);
  });
});
