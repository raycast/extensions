/**
 * Thin, strictly typed HTTP client for the canonical Frihet v1 REST API
 * (`https://api.frihet.io/v1`).
 *
 * Security & reliability invariants:
 * - Zero external telemetry or third-party HTTP calls (Raycast Store rule).
 * - Credentials (`X-API-Key`) are only sent to validated Frihet HTTPS origins
 *   (or localhost test harnesses) with `redirect: "manual"` to prevent
 *   redirect-based credential leakage.
 * - All requests are scoped to a `TenantScopedCache` namespace derived from
 *   `(apiBaseUrl, apiKey)` (`AUTH-02`).
 * - Actionable error classification for 401, 403, 404, 429, 5xx, and offline
 *   states (`AUTH-01`, `REL-01`).
 */

import {
  computeTenantNamespace,
  DEFAULT_API_BASE_URL,
  globalTenantCache,
  normalizeApiBaseUrl,
  TenantScopedCache,
} from "./tenant-cache.js";
import type {
  BusinessContext,
  ClientActivityRecord,
  ClientRecord,
  CurrencyBucketAmount,
  DeepLinkSection,
  ExpenseRecord,
  InvoiceRecord,
  PaginatedResponse,
  ProductActiveFilter,
  ProductRecord,
  ProductSearchResult,
  ProvenancedAmount,
  QuoteRecord,
} from "./types.js";

const REQUEST_TIMEOUT_MS = 20_000;
const USER_AGENT = "frihet-mcp-server frihet-raycast/0.1.0";
const SOURCE_HEADER = "raycast";

export class FrihetApiError extends Error {
  public readonly isAuthError: boolean;
  public readonly isPermissionError: boolean;
  public readonly isOfflineError: boolean;
  public readonly isRateLimitError: boolean;
  public readonly remediation: string;

  constructor(
    public readonly statusCode: number,
    public readonly errorCode: string,
    message: string,
    public readonly requestId?: string,
  ) {
    super(message);
    this.name = "FrihetApiError";
    this.isAuthError = statusCode === 401;
    this.isPermissionError = statusCode === 403;
    this.isOfflineError =
      statusCode === 0 || statusCode === 408 || statusCode === 503;
    this.isRateLimitError = statusCode === 429;
    this.remediation = buildRemediation(statusCode, errorCode);
  }
}

function buildRemediation(statusCode: number, errorCode: string): string {
  if (statusCode === 401) {
    return "Your Frihet API key is missing, invalid, or revoked. Open Raycast Extension Preferences and enter an active fri_... key from Frihet -> Settings -> API Keys.";
  }
  if (statusCode === 403) {
    return "Your API key does not have permission for this workspace resource. Verify your role and API key scopes in Frihet.";
  }
  if (statusCode === 404) {
    return "The requested record was not found in the active workspace.";
  }
  if (statusCode === 429) {
    return "Frihet API rate limit reached. Wait a few seconds and press Cmd+R to refresh.";
  }
  if (statusCode === 408 || statusCode === 0 || errorCode === "network_error") {
    return "Could not reach Frihet API. Check your network connection and retry.";
  }
  return "Frihet API returned an unexpected error. Retry in a moment or open Frihet in your browser.";
}

function encodePathSegment(id: string): string {
  const clean = String(id).trim();
  if (!clean || clean === "." || clean === ".." || clean.includes("/")) {
    throw new FrihetApiError(
      400,
      "invalid_identifier",
      "Invalid resource identifier.",
    );
  }
  return encodeURIComponent(clean);
}

/**
 * Validates that the base URL points to `api.frihet.io` (or a `*.frihet.io`
 * subdomain) over HTTPS, or a local loopback test server (`127.0.0.1` / `localhost`).
 */
export function validateSafeApiBaseUrl(rawBaseUrl?: string): string {
  const normalized = normalizeApiBaseUrl(rawBaseUrl);
  let parsed: URL;
  try {
    parsed = new URL(normalized);
  } catch {
    throw new FrihetApiError(
      400,
      "invalid_base_url",
      "Invalid Frihet API Base URL configured in preferences.",
    );
  }
  if (parsed.username || parsed.password) {
    throw new FrihetApiError(
      400,
      "invalid_base_url",
      "API Base URL must not embed credentials.",
    );
  }
  const host = parsed.hostname.toLowerCase();
  const isLoopback =
    host === "127.0.0.1" || host === "localhost" || host === "::1";
  if (isLoopback) {
    return normalized;
  }
  if (parsed.protocol !== "https:") {
    throw new FrihetApiError(
      400,
      "insecure_base_url",
      "Frihet API Base URL must use HTTPS.",
    );
  }
  if (host !== "api.frihet.io" && !host.endsWith(".frihet.io")) {
    throw new FrihetApiError(
      400,
      "untrusted_base_url",
      "Frihet API key can only be sent to *.frihet.io origins.",
    );
  }
  return normalized;
}

export function roundCurrency(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function isFiniteRateInRange(value: unknown, min = 0, max = 100): boolean {
  if (value === undefined || value === null) return true;
  return (
    typeof value === "number" &&
    Number.isFinite(value) &&
    value >= min &&
    value <= max
  );
}

/**
 * Canonical monetary resolution matching `Frihet-io/frihet-mcp#257` (`daily-operational-brief.ts`):
 * - Absent != 0: `{}` without `total`, `amount`, or valid `items` returns `amount: null, provenance: "unavailable", unavailableCount: 1`.
 * - Canonical discounts & taxes: applies per-line `discount` (or `discountRate`), document-level
 *   `discountRate`, `taxRate`, `equivalenceSurchargeRate`, and `irpfRate` over the discounted
 *   tax-exclusive base.
 * - Fails closed to `unavailable` on unsupported calculation modifiers (`pricesIncludeTax: true`,
 *   `deductLineDiscountAmounts: true`, `compoundTaxes`, `prepayment`, `discountAmount`).
 */
export function resolveDocumentAmount(
  doc:
    | Record<string, unknown>
    | {
        total?: unknown;
        amount?: unknown;
        items?: unknown;
        taxRate?: unknown;
        irpfRate?: unknown;
        equivalenceSurchargeRate?: unknown;
        discountRate?: unknown;
        pricesIncludeTax?: unknown;
        deductLineDiscountAmounts?: unknown;
        compoundTaxes?: unknown;
        prepayment?: unknown;
        currency?: unknown;
      },
  defaultCurrency = "EUR",
): ProvenancedAmount {
  const record = doc as Record<string, unknown>;
  const currency =
    typeof record.currency === "string" && record.currency.trim().length > 0
      ? record.currency.trim().toUpperCase()
      : defaultCurrency.trim().toUpperCase();

  if (typeof record.total === "number" && Number.isFinite(record.total)) {
    return {
      amount: roundCurrency(record.total),
      currency,
      provenance: "stored_field",
      formula: "doc.total",
      fieldOrFormula: "doc.total",
    };
  }

  if (typeof record.amount === "number" && Number.isFinite(record.amount)) {
    return {
      amount: roundCurrency(record.amount),
      currency,
      provenance: "stored_field",
      formula: "doc.amount",
      fieldOrFormula: "doc.amount",
    };
  }

  // Absent != 0: if neither stored total nor stored amount exists, we require a non-empty
  // items array where every line item has finite non-negative quantity and unitPrice, and no
  // unsupported calculation modifiers are present.
  if (!Array.isArray(record.items) || record.items.length === 0) {
    const formula = "unavailable (missing total, amount, and valid line items)";
    return {
      amount: null,
      currency,
      provenance: "unavailable",
      formula,
      fieldOrFormula: formula,
      unavailableCount: 1,
    };
  }

  if (
    record.pricesIncludeTax === true ||
    record.deductLineDiscountAmounts === true ||
    (Array.isArray(record.compoundTaxes) && record.compoundTaxes.length > 0) ||
    (record.prepayment !== undefined &&
      record.prepayment !== null &&
      record.prepayment !== 0) ||
    !isFiniteRateInRange(record.discountRate, 0, 100) ||
    !isFiniteRateInRange(record.taxRate, 0, 100) ||
    !isFiniteRateInRange(record.irpfRate, 0, 100) ||
    !isFiniteRateInRange(record.equivalenceSurchargeRate, 0, 100)
  ) {
    const formula =
      "unavailable (unsupported or invalid calculation modifiers without stored total)";
    return {
      amount: null,
      currency,
      provenance: "unavailable",
      formula,
      fieldOrFormula: formula,
      unavailableCount: 1,
    };
  }

  const items = record.items as Array<Record<string, unknown>>;
  const docTaxRate = typeof record.taxRate === "number" ? record.taxRate : 0;
  const docDiscountPct =
    typeof record.discountRate === "number" ? record.discountRate : 0;
  const docIrpfRate = typeof record.irpfRate === "number" ? record.irpfRate : 0;
  const docSurchargeRate =
    typeof record.equivalenceSurchargeRate === "number"
      ? record.equivalenceSurchargeRate
      : 0;

  const baseByRate = new Map<number, number>();
  let subtotalBeforeDiscount = 0;

  for (const item of items) {
    const rawLineDiscount =
      item?.discount !== undefined ? item.discount : item?.discountRate;
    if (
      !item ||
      typeof item !== "object" ||
      typeof item.quantity !== "number" ||
      !Number.isFinite(item.quantity) ||
      item.quantity < 0 ||
      typeof item.unitPrice !== "number" ||
      !Number.isFinite(item.unitPrice) ||
      item.unitPrice < 0 ||
      (item.discountAmount !== undefined &&
        item.discountAmount !== null &&
        item.discountAmount !== 0) ||
      !isFiniteRateInRange(rawLineDiscount, 0, 100) ||
      !isFiniteRateInRange(item.taxRate, 0, 100)
    ) {
      const formula =
        "unavailable (corrupt or incomplete line item without stored total)";
      return {
        amount: null,
        currency,
        provenance: "unavailable",
        formula,
        fieldOrFormula: formula,
        unavailableCount: 1,
      };
    }

    const effectiveRate =
      typeof item.taxRate === "number" ? item.taxRate : docTaxRate;
    const lineDiscountPct =
      typeof rawLineDiscount === "number" ? rawLineDiscount : 0;
    const effectiveUnitPrice = roundCurrency(
      item.unitPrice * (1 - lineDiscountPct / 100),
    );
    const lineBase = roundCurrency(item.quantity * effectiveUnitPrice);

    subtotalBeforeDiscount = roundCurrency(subtotalBeforeDiscount + lineBase);
    baseByRate.set(
      effectiveRate,
      roundCurrency((baseByRate.get(effectiveRate) ?? 0) + lineBase),
    );
  }

  const documentDiscount = roundCurrency(
    subtotalBeforeDiscount * (docDiscountPct / 100),
  );
  const subtotal = roundCurrency(subtotalBeforeDiscount - documentDiscount);

  if (docDiscountPct > 0 && subtotalBeforeDiscount > 0) {
    const rates = [...baseByRate.keys()].sort((a, b) => b - a);
    for (let i = 0; i < rates.length; i++) {
      const rate = rates[i]!;
      const originalBase = baseByRate.get(rate)!;
      if (i === rates.length - 1) {
        let otherGroupsTotal = 0;
        for (let j = 0; j < i; j++) {
          otherGroupsTotal = roundCurrency(
            otherGroupsTotal + baseByRate.get(rates[j]!)!,
          );
        }
        baseByRate.set(rate, roundCurrency(subtotal - otherGroupsTotal));
      } else {
        const groupDiscount = roundCurrency(
          originalBase * (docDiscountPct / 100),
        );
        baseByRate.set(rate, roundCurrency(originalBase - groupDiscount));
      }
    }
  }

  let totalTax = 0;
  for (const [rate, base] of [...baseByRate.entries()].sort(
    (a, b) => b[0] - a[0],
  )) {
    const tax = roundCurrency(base * (rate / 100));
    totalTax = roundCurrency(totalTax + tax);
  }

  const irpf = roundCurrency(subtotal * (docIrpfRate / 100));
  const surcharge = roundCurrency(subtotal * (docSurchargeRate / 100));
  const total = roundCurrency(subtotal + totalTax + surcharge - irpf);
  const formula =
    "canonical_invoice_calculation(items[qty*round(unitPrice*(1-lineDiscount))], docDiscountRate, taxRate, equivalenceSurchargeRate, irpfRate)";

  return {
    amount: total,
    currency,
    provenance: "derived_from_items",
    formula,
    fieldOrFormula: formula,
  };
}

/**
 * Multi-currency & unavailability-preserving sum of `ProvenancedAmount` records.
 * - Never coerces an `unavailable` record to `0`.
 * - Never sums across distinct currencies (`currency: "MIXED"`, `provenance: "mixed_currency_unconverted"`).
 */
export function sumProvenancedAmounts(
  amounts: readonly ProvenancedAmount[],
  defaultCurrency = "EUR",
): ProvenancedAmount {
  const normalizedDefault = defaultCurrency.trim().toUpperCase();
  if (amounts.length === 0) {
    return {
      amount: 0,
      currency: normalizedDefault,
      provenance: "stored_field",
      formula: "sum(0 documents)",
      fieldOrFormula: "sum(0 documents)",
      totalsByCurrency: {},
      unavailableCount: 0,
    };
  }

  const totalsByCurrency: Record<string, CurrencyBucketAmount> = {};
  let unavailableCount = 0;

  for (const item of amounts) {
    if (
      item.amount === null ||
      !Number.isFinite(item.amount) ||
      item.provenance === "unavailable"
    ) {
      unavailableCount += item.unavailableCount ?? 1;
      continue;
    }

    const curr = (item.currency || normalizedDefault).trim().toUpperCase();
    const existing = totalsByCurrency[curr];
    const itemProv: "stored_field" | "derived_from_items" =
      item.provenance === "derived_from_items" ||
      item.provenance === "derived_from_lines"
        ? "derived_from_items"
        : "stored_field";

    if (!existing) {
      totalsByCurrency[curr] = {
        amount: roundCurrency(item.amount),
        currency: curr,
        provenance: itemProv,
        documentCount: 1,
      };
    } else {
      existing.amount = roundCurrency(existing.amount + item.amount);
      existing.documentCount += 1;
      if (itemProv === "derived_from_items") {
        existing.provenance = "derived_from_items";
      }
    }
  }

  const currencies = Object.keys(totalsByCurrency);

  if (unavailableCount > 0) {
    const formula = `unavailable (${unavailableCount} document(s) missing valid amount; never coerced to 0)`;
    return {
      amount: null,
      currency:
        currencies.length === 1
          ? currencies[0]!
          : currencies.length > 1
            ? "MIXED"
            : normalizedDefault,
      provenance: "unavailable",
      formula,
      fieldOrFormula: formula,
      totalsByCurrency,
      unavailableCount,
    };
  }

  if (currencies.length > 1) {
    const breakdownText = currencies
      .sort()
      .map((c) => `${c}: ${totalsByCurrency[c]!.amount.toFixed(2)}`)
      .join(", ");
    const formula = `unconverted multi-currency totals (${breakdownText})`;
    return {
      amount: null,
      currency: "MIXED",
      provenance: "mixed_currency_unconverted",
      formula,
      fieldOrFormula: formula,
      totalsByCurrency,
      unavailableCount: 0,
    };
  }

  const singleCurr = currencies[0] ?? normalizedDefault;
  const bucket = totalsByCurrency[singleCurr];
  const anyDerived = bucket?.provenance === "derived_from_items";
  const formula = anyDerived
    ? "sum(stored doc.total/amount + canonical derived item totals)"
    : "sum(stored doc.total/amount)";

  return {
    amount: bucket ? bucket.amount : 0,
    currency: singleCurr,
    provenance: anyDerived ? "derived_from_items" : "stored_field",
    formula,
    fieldOrFormula: formula,
    totalsByCurrency,
    unavailableCount: 0,
  };
}

export function formatProvenancedAmount(p: ProvenancedAmount): string {
  if (p.provenance === "mixed_currency_unconverted" && p.totalsByCurrency) {
    const parts = Object.values(p.totalsByCurrency).map(
      (bucket) => `${bucket.amount.toFixed(2)} ${bucket.currency}`,
    );
    return `MIXED (${parts.join(" + ")})`;
  }
  if (p.amount === null || p.provenance === "unavailable") {
    const unavailableCount = p.unavailableCount ?? 1;
    const knownParts = p.totalsByCurrency
      ? Object.values(p.totalsByCurrency).map(
          (b) => `${b.amount.toFixed(2)} ${b.currency}`,
        )
      : [];
    if (knownParts.length > 0) {
      return `NO DETERMINADO (${unavailableCount} doc(s) sin importe válido; parcial conocido: ${knownParts.join(" + ")})`;
    }
    return `NO DETERMINADO (${unavailableCount} doc(s) sin importe válido)`;
  }
  return `${p.amount.toFixed(2)} ${p.currency}`;
}

export function formatCurrencyAmount(
  amount: number | null | undefined,
  currency = "EUR",
): string {
  if (amount === null || amount === undefined || !Number.isFinite(amount)) {
    return currency === "MIXED" ? "MIXED (multi-currency)" : "Unavailable";
  }
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency && currency !== "MIXED" ? currency : "EUR",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currency || "EUR"}`;
  }
}

/**
 * Legacy-aware product active status predicate (`READ-01`, ERP #2944).
 * Products created before explicit `isActive` defaults may omit `isActive`
 * (`undefined`). Those records are active unless explicitly set to `false`.
 */
export function isProductEffectivelyActive(
  product: Pick<ProductRecord, "isActive">,
): boolean {
  return product.isActive !== false;
}

export function filterProductsByActiveMode(
  products: readonly ProductRecord[],
  filter: ProductActiveFilter,
): ProductRecord[] {
  if (filter === "all") return [...products];
  if (filter === "active") {
    return products.filter((p) => isProductEffectivelyActive(p));
  }
  return products.filter((p) => p.isActive === false);
}

/**
 * Verified deep links into the Frihet web application (`https://app.frihet.io`).
 */
export function buildFrihetDeepLink(section: DeepLinkSection): string {
  switch (section) {
    case "invoices":
      return "https://app.frihet.io/invoices";
    case "clients":
      return "https://app.frihet.io/clients";
    case "products":
      return "https://app.frihet.io/products";
    case "quotes":
      return "https://app.frihet.io/quotes";
    case "expenses":
      return "https://app.frihet.io/expenses";
    case "dashboard":
    default:
      return "https://app.frihet.io/";
  }
}

export interface FrihetClientOptions {
  apiKey: string;
  apiBaseUrl?: string;
  cache?: TenantScopedCache;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
}

export class FrihetRestClient {
  public readonly baseUrl: string;
  public readonly tenantNamespace: string;
  private readonly apiKey: string;
  private readonly cache: TenantScopedCache;
  private readonly fetchImpl: typeof fetch;
  private readonly timeoutMs: number;

  constructor(options: FrihetClientOptions) {
    const cleanKey = (options.apiKey ?? "").trim();
    if (!cleanKey) {
      throw new FrihetApiError(
        401,
        "missing_api_key",
        "Frihet API key is required. Configure it in Raycast Extension Preferences.",
      );
    }
    this.apiKey = cleanKey;
    this.baseUrl = validateSafeApiBaseUrl(
      options.apiBaseUrl ?? DEFAULT_API_BASE_URL,
    );
    this.cache = options.cache ?? globalTenantCache;
    this.fetchImpl = options.fetchImpl ?? globalThis.fetch;
    this.timeoutMs = options.timeoutMs ?? REQUEST_TIMEOUT_MS;
    this.tenantNamespace = computeTenantNamespace(this.baseUrl, this.apiKey);
    this.cache.activateNamespace(this.tenantNamespace);
  }

  private async requestJson<T>(
    path: string,
    options?: {
      query?: Record<string, string | number | undefined>;
      slotKey?: string;
      cacheKey?: string;
      bypassCache?: boolean;
      signal?: AbortSignal;
    },
  ): Promise<T> {
    const cacheKey = options?.cacheKey;
    if (cacheKey && !options?.bypassCache) {
      const cached = this.cache.get<T>(this.tenantNamespace, cacheKey);
      if (cached !== undefined) {
        return cached;
      }
    }

    const slotKey =
      options?.slotKey ?? `${path}?${JSON.stringify(options?.query ?? {})}`;
    const { controller, generation, complete } = this.cache.beginRequest(
      this.tenantNamespace,
      slotKey,
    );

    const onExternalAbort = (): void =>
      controller.abort(options?.signal?.reason);
    if (options?.signal) {
      if (options.signal.aborted) {
        complete();
        throw new FrihetApiError(
          499,
          "request_aborted",
          "Request was cancelled.",
        );
      }
      options.signal.addEventListener("abort", onExternalAbort, { once: true });
    }

    const timeoutId = setTimeout(() => {
      controller.abort(new Error("request_timeout"));
    }, this.timeoutMs);

    const url = new URL(`${this.baseUrl}${path}`);
    if (options?.query) {
      for (const [k, v] of Object.entries(options.query)) {
        if (v !== undefined && v !== "") {
          url.searchParams.set(k, String(v));
        }
      }
    }

    let response: Response;
    try {
      response = await this.fetchImpl(url.toString(), {
        method: "GET",
        redirect: "manual",
        headers: {
          "X-API-Key": this.apiKey,
          Accept: "application/json",
          "X-Frihet-Source": SOURCE_HEADER,
          "User-Agent": USER_AGENT,
        },
        signal: controller.signal,
      });
    } catch {
      clearTimeout(timeoutId);
      complete();
      if (options?.signal) {
        options.signal.removeEventListener("abort", onExternalAbort);
      }
      if (controller.signal.aborted) {
        const reason = controller.signal.reason;
        if (reason instanceof Error && reason.message === "request_timeout") {
          throw new FrihetApiError(
            408,
            "request_timeout",
            `Request to ${path} timed out after ${Math.round(this.timeoutMs / 1000)}s.`,
          );
        }
        throw new FrihetApiError(
          499,
          "request_aborted",
          "Search request cancelled.",
        );
      }
      throw new FrihetApiError(
        503,
        "network_error",
        "Network error while connecting to Frihet API.",
      );
    }

    clearTimeout(timeoutId);
    complete();
    if (options?.signal) {
      options.signal.removeEventListener("abort", onExternalAbort);
    }

    // Refuse HTTP redirects so the API key is never forwarded to another host.
    if (response.status >= 300 && response.status < 400) {
      throw new FrihetApiError(
        502,
        "unexpected_redirect",
        "Refused unexpected HTTP redirect from API endpoint.",
      );
    }

    if (!response.ok) {
      let errorCode = `http_${response.status}`;
      let message = response.statusText || `HTTP ${response.status}`;
      let requestId = response.headers.get("x-request-id") ?? undefined;
      try {
        const errJson = (await response.json()) as Record<string, unknown>;
        if (typeof errJson.error === "string" && errJson.error.trim()) {
          errorCode = errJson.error.trim();
          message = errorCode;
        }
        if (typeof errJson.message === "string" && errJson.message.trim()) {
          message = errJson.message.trim();
        }
        if (
          typeof errJson.meta === "object" &&
          errJson.meta !== null &&
          typeof (errJson.meta as Record<string, unknown>).requestId ===
            "string"
        ) {
          requestId = (errJson.meta as Record<string, string>).requestId;
        }
      } catch {
        // Ignore non-JSON error body
      }
      throw new FrihetApiError(response.status, errorCode, message, requestId);
    }

    const raw = (await response.json()) as unknown;
    if (raw === null || raw === undefined) {
      throw new FrihetApiError(
        200,
        "empty_response",
        "Frihet API returned an empty JSON body.",
      );
    }

    if (cacheKey) {
      this.cache.set(this.tenantNamespace, cacheKey, raw, generation);
    }

    return raw as T;
  }

  private unwrapSingle<T>(raw: unknown): T {
    if (
      raw !== null &&
      typeof raw === "object" &&
      !Array.isArray(raw) &&
      "data" in raw
    ) {
      const inner = (raw as { data: unknown }).data;
      if (
        inner !== null &&
        typeof inner === "object" &&
        !Array.isArray(inner)
      ) {
        return inner as T;
      }
    }
    return raw as T;
  }

  private unwrapPaginated<T>(raw: unknown): PaginatedResponse<T> {
    if (
      raw === null ||
      typeof raw !== "object" ||
      !Array.isArray((raw as { data?: unknown }).data)
    ) {
      throw new FrihetApiError(
        200,
        "invalid_paginated_response",
        "Frihet API returned an unexpected list response shape.",
      );
    }
    const page = raw as PaginatedResponse<T>;
    return {
      data: page.data,
      total: typeof page.total === "number" ? page.total : page.data.length,
      limit: typeof page.limit === "number" ? page.limit : page.data.length,
      offset: typeof page.offset === "number" ? page.offset : 0,
      ...(typeof page.nextCursor === "string" && page.nextCursor
        ? { nextCursor: page.nextCursor }
        : {}),
      ...(typeof page.truncated === "boolean"
        ? { truncated: page.truncated }
        : {}),
    };
  }

  // ------------------------------------------------------------------
  // Intelligence / Context
  // ------------------------------------------------------------------

  async getBusinessContext(options?: {
    bypassCache?: boolean;
    signal?: AbortSignal;
  }): Promise<BusinessContext> {
    const raw = await this.requestJson<unknown>("/context", {
      slotKey: "context",
      cacheKey: "context",
      bypassCache: options?.bypassCache,
      signal: options?.signal,
    });
    return this.unwrapSingle<BusinessContext>(raw);
  }

  // ------------------------------------------------------------------
  // Invoices
  // ------------------------------------------------------------------

  async listInvoices(params?: {
    q?: string;
    status?: string;
    clientId?: string;
    from?: string;
    to?: string;
    limit?: number;
    offset?: number;
    after?: string;
    bypassCache?: boolean;
    signal?: AbortSignal;
  }): Promise<PaginatedResponse<InvoiceRecord>> {
    const query = {
      q: params?.q?.trim() || undefined,
      status:
        params?.status && params.status !== "all" ? params.status : undefined,
      clientId: params?.clientId,
      from: params?.from,
      to: params?.to,
      limit: params?.limit ?? 25,
      offset: params?.offset,
      cursor: params?.after,
    };
    const cacheKey = `invoices:${JSON.stringify(query)}`;
    const raw = await this.requestJson<unknown>("/invoices", {
      query,
      slotKey: "invoices:list",
      cacheKey,
      bypassCache: params?.bypassCache,
      signal: params?.signal,
    });
    return this.unwrapPaginated<InvoiceRecord>(raw);
  }

  async getInvoice(
    id: string,
    options?: { bypassCache?: boolean; signal?: AbortSignal },
  ): Promise<InvoiceRecord> {
    const encoded = encodePathSegment(id);
    const raw = await this.requestJson<unknown>(`/invoices/${encoded}`, {
      slotKey: `invoice:detail:${encoded}`,
      cacheKey: `invoice:detail:${encoded}`,
      bypassCache: options?.bypassCache,
      signal: options?.signal,
    });
    return this.unwrapSingle<InvoiceRecord>(raw);
  }

  // ------------------------------------------------------------------
  // Clients & CRM Activities
  // ------------------------------------------------------------------

  async listClients(params?: {
    q?: string;
    stage?: string;
    limit?: number;
    offset?: number;
    after?: string;
    bypassCache?: boolean;
    signal?: AbortSignal;
  }): Promise<PaginatedResponse<ClientRecord>> {
    const query = {
      q: params?.q?.trim() || undefined,
      stage: params?.stage,
      limit: params?.limit ?? 25,
      offset: params?.offset,
      cursor: params?.after,
    };
    const cacheKey = `clients:${JSON.stringify(query)}`;
    const raw = await this.requestJson<unknown>("/clients", {
      query,
      slotKey: "clients:list",
      cacheKey,
      bypassCache: params?.bypassCache,
      signal: params?.signal,
    });
    return this.unwrapPaginated<ClientRecord>(raw);
  }

  async getClient(
    id: string,
    options?: { bypassCache?: boolean; signal?: AbortSignal },
  ): Promise<ClientRecord> {
    const encoded = encodePathSegment(id);
    const raw = await this.requestJson<unknown>(`/clients/${encoded}`, {
      slotKey: `client:detail:${encoded}`,
      cacheKey: `client:detail:${encoded}`,
      bypassCache: options?.bypassCache,
      signal: options?.signal,
    });
    return this.unwrapSingle<ClientRecord>(raw);
  }

  async listClientActivities(
    clientId: string,
    params?: {
      limit?: number;
      offset?: number;
      bypassCache?: boolean;
      signal?: AbortSignal;
    },
  ): Promise<PaginatedResponse<ClientActivityRecord>> {
    const encoded = encodePathSegment(clientId);
    const query = {
      limit: params?.limit ?? 10,
      offset: params?.offset,
    };
    const cacheKey = `client-activities:${encoded}:${JSON.stringify(query)}`;
    const raw = await this.requestJson<unknown>(
      `/clients/${encoded}/activities`,
      {
        query,
        slotKey: `client:activities:${encoded}`,
        cacheKey,
        bypassCache: params?.bypassCache,
        signal: params?.signal,
      },
    );
    return this.unwrapPaginated<ClientActivityRecord>(raw);
  }

  // ------------------------------------------------------------------
  // Products (with legacy `isActive` + pre-#2944 500 fallback)
  // ------------------------------------------------------------------

  async listProducts(params?: {
    q?: string;
    isActive?: boolean;
    activeFilter?: ProductActiveFilter;
    limit?: number;
    offset?: number;
    after?: string;
    bypassCache?: boolean;
    signal?: AbortSignal;
  }): Promise<ProductSearchResult> {
    const resolvedFilter: ProductActiveFilter =
      params?.activeFilter ??
      (params?.isActive === true
        ? "active"
        : params?.isActive === false
          ? "inactive"
          : "all");
    return this.searchProducts({
      ...params,
      activeFilter: resolvedFilter,
    });
  }

  async searchProducts(params?: {
    q?: string;
    activeFilter?: ProductActiveFilter;
    limit?: number;
    offset?: number;
    after?: string;
    bypassCache?: boolean;
    signal?: AbortSignal;
  }): Promise<ProductSearchResult> {
    const filter: ProductActiveFilter = params?.activeFilter ?? "all";
    const baseQuery = {
      q: params?.q?.trim() || undefined,
      limit: params?.limit ?? 25,
      offset: params?.offset,
      cursor: params?.after,
    };

    if (filter === "all") {
      const cacheKey = `products:${JSON.stringify({ ...baseQuery, isActive: undefined })}`;
      const raw = await this.requestJson<unknown>("/products", {
        query: baseQuery,
        slotKey: "products:list",
        cacheKey,
        bypassCache: params?.bypassCache,
        signal: params?.signal,
      });
      const page = this.unwrapPaginated<ProductRecord>(raw);
      return {
        ...page,
        usedClientFallback: false,
        usedClientSideFallback: false,
        fallbackCoveragePartial: false,
      };
    }

    const targetIsActive = filter === "active" ? "true" : "false";
    try {
      const serverQuery = { ...baseQuery, isActive: targetIsActive };
      const cacheKey = `products:${JSON.stringify(serverQuery)}`;
      const raw = await this.requestJson<unknown>("/products", {
        query: serverQuery,
        slotKey: "products:list",
        cacheKey,
        bypassCache: params?.bypassCache,
        signal: params?.signal,
      });
      const page = this.unwrapPaginated<ProductRecord>(raw);
      const filtered = filterProductsByActiveMode(page.data, filter);
      return {
        data: filtered,
        total: page.total,
        limit: page.limit,
        offset: page.offset,
        ...(page.nextCursor ? { nextCursor: page.nextCursor } : {}),
        ...(typeof page.truncated === "boolean"
          ? { truncated: page.truncated }
          : {}),
        usedClientFallback: false,
        usedClientSideFallback: false,
        fallbackCoveragePartial: false,
      };
    } catch (error) {
      // Temporary fallback until berthelius/Frihet-ERP#2944 is deployed to production; remove once GET /v1/products?isActive=true returns 200 in production
      if (
        error instanceof FrihetApiError &&
        error.statusCode >= 500 &&
        error.statusCode < 600
      ) {
        const fallbackCacheKey = `products:fallback:${JSON.stringify(baseQuery)}`;
        const rawFallback = await this.requestJson<unknown>("/products", {
          query: baseQuery,
          slotKey: "products:list",
          cacheKey: fallbackCacheKey,
          bypassCache: params?.bypassCache,
          signal: params?.signal,
        });
        const unfilteredPage = this.unwrapPaginated<ProductRecord>(rawFallback);
        const filteredRows = filterProductsByActiveMode(
          unfilteredPage.data,
          filter,
        );
        const fallbackCoveragePartial =
          unfilteredPage.total > unfilteredPage.data.length ||
          Boolean(unfilteredPage.nextCursor) ||
          Boolean(unfilteredPage.truncated);
        return {
          data: filteredRows,
          total: fallbackCoveragePartial
            ? unfilteredPage.total
            : filteredRows.length,
          limit: unfilteredPage.limit,
          offset: unfilteredPage.offset,
          ...(unfilteredPage.nextCursor
            ? { nextCursor: unfilteredPage.nextCursor }
            : {}),
          ...(typeof unfilteredPage.truncated === "boolean"
            ? { truncated: unfilteredPage.truncated }
            : {}),
          usedClientFallback: true,
          usedClientSideFallback: true,
          fallbackCoveragePartial,
          fallbackReason: `Server returned HTTP ${error.statusCode} on ?isActive=${targetIsActive}; applied client-side filter preserving legacy products${fallbackCoveragePartial ? " (partial page coverage)" : ""}.`,
        };
      }
      throw error;
    }
  }

  // ------------------------------------------------------------------
  // Quotes & Expenses (used by Business Brief)
  // ------------------------------------------------------------------

  async listQuotes(params?: {
    status?: string;
    limit?: number;
    offset?: number;
    after?: string;
    bypassCache?: boolean;
    signal?: AbortSignal;
  }): Promise<PaginatedResponse<QuoteRecord>> {
    const query = {
      status: params?.status,
      limit: params?.limit ?? 25,
      offset: params?.offset,
      cursor: params?.after,
    };
    const cacheKey = `quotes:${JSON.stringify(query)}`;
    const raw = await this.requestJson<unknown>("/quotes", {
      query,
      slotKey: "quotes:list",
      cacheKey,
      bypassCache: params?.bypassCache,
      signal: params?.signal,
    });
    return this.unwrapPaginated<QuoteRecord>(raw);
  }

  async listExpenses(params?: {
    from?: string;
    to?: string;
    category?: string;
    vendorId?: string;
    limit?: number;
    offset?: number;
    after?: string;
    bypassCache?: boolean;
    signal?: AbortSignal;
  }): Promise<PaginatedResponse<ExpenseRecord>> {
    const query = {
      from: params?.from,
      to: params?.to,
      category: params?.category,
      vendorId: params?.vendorId,
      limit: params?.limit ?? 25,
      offset: params?.offset,
      cursor: params?.after,
    };
    const cacheKey = `expenses:${JSON.stringify(query)}`;
    const raw = await this.requestJson<unknown>("/expenses", {
      query,
      slotKey: "expenses:list",
      cacheKey,
      bypassCache: params?.bypassCache,
      signal: params?.signal,
    });
    return this.unwrapPaginated<ExpenseRecord>(raw);
  }
}

export { FrihetRestClient as FrihetRaycastClient };
