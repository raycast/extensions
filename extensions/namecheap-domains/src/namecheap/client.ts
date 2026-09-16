import { NamecheapApiError, parseApiResponse, parseDomainCheck, parseDomainList, parsePricing } from "./parse";
import type {
  Domain,
  DomainCheckResult,
  DomainListPage,
  DomainListType,
  DomainSortBy,
  NamecheapConfig,
  NamecheapEnvironment,
  PricingTable,
} from "./types";

export const ENDPOINTS = {
  production: "https://api.namecheap.com/xml.response",
  sandbox: "https://api.sandbox.namecheap.com/xml.response",
} as const;

/** Namecheap rejects more than 50 domains per domains.check call. */
export const MAX_CHECK_DOMAINS = 50;
/** domains.getList accepts a PageSize between 10 and 100. */
export const MAX_PAGE_SIZE = 100;
const MIN_PAGE_SIZE = 10;
const MAX_PAGES = 100;
const REQUEST_TIMEOUT_MS = 30_000;

export type ApiParams = Record<string, string | number | boolean | undefined | null>;

export interface CallOptions {
  /**
   * Defaults to POST. Namecheap accepts either, but a GET puts the API key in the URL, where it can be
   * recorded by the CDN in front of the API, by proxies, and by anything that captures request URLs.
   */
  method?: "GET" | "POST";
  signal?: AbortSignal;
}

export interface ListDomainsOptions {
  listType?: DomainListType;
  searchTerm?: string;
  page?: number;
  pageSize?: number;
  sortBy?: DomainSortBy;
}

export interface NamecheapClient {
  readonly endpoint: string;
  readonly environment: NamecheapEnvironment;
  /** Low-level call. `command` may omit the `namecheap.` prefix. Resolves to the CommandResponse body. */
  call(command: string, params?: ApiParams, options?: CallOptions): Promise<Record<string, unknown>>;
  listDomains(options?: ListDomainsOptions): Promise<DomainListPage>;
  /** Walks every page of domains.getList (100 per page). */
  listAllDomains(options?: Omit<ListDomainsOptions, "page" | "pageSize">): Promise<Domain[]>;
  /** Checks availability, chunking requests by 50 and preserving the requested order. */
  checkDomains(domains: string[]): Promise<DomainCheckResult[]>;
  /** Registration pricing for every TLD. Namecheap asks callers to cache this response. */
  getRegisterPricing(): Promise<PricingTable>;
}

export function createClient(config: NamecheapConfig, fetchImpl: typeof fetch = fetch): NamecheapClient {
  const apiUser = config.apiUser.trim();
  const apiKey = config.apiKey.trim();
  if (!apiUser || !apiKey) throw new Error("Namecheap API User and API Key are required.");
  const userName = config.userName?.trim() || apiUser;
  const clientIp = config.clientIp.trim();
  // Namecheap requires this parameter and checks only its format. It authorizes the address the request
  // actually comes from, so this value cannot be used to pass the whitelist check.
  if (!clientIp) throw new Error("A Client IP value is required for Namecheap API calls.");
  const environment: NamecheapEnvironment = config.sandbox ? "sandbox" : "production";
  const endpoint = ENDPOINTS[environment];

  async function call(command: string, params: ApiParams = {}, options: CallOptions = {}) {
    const query = new URLSearchParams({
      ApiUser: apiUser,
      ApiKey: apiKey,
      UserName: userName,
      ClientIp: clientIp,
      Command: command.startsWith("namecheap.") ? command : `namecheap.${command}`,
    });
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null && value !== "") query.set(key, String(value));
    }

    const method = options.method ?? "POST";
    const signal = options.signal ?? AbortSignal.timeout(REQUEST_TIMEOUT_MS);
    const response =
      method === "POST"
        ? await fetchImpl(endpoint, {
            method,
            signal,
            headers: { "content-type": "application/x-www-form-urlencoded" },
            body: query.toString(),
          })
        : await fetchImpl(`${endpoint}?${query.toString()}`, { method, signal });

    const text = await response.text();
    try {
      return parseApiResponse(text, environment);
    } catch (error) {
      // A non-2xx response may still carry a parseable API error. Anything else loses its meaning without
      // the status, which matters because the API sits behind a CDN that answers 403 and 429 with HTML.
      if (error instanceof NamecheapApiError || response.ok) throw error;
      throw new Error(
        `Namecheap API responded with HTTP ${response.status}${text ? `: ${text.trim().slice(0, 200)}` : ""}`,
      );
    }
  }

  async function listDomains(options: ListDomainsOptions = {}): Promise<DomainListPage> {
    const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(MIN_PAGE_SIZE, options.pageSize ?? MAX_PAGE_SIZE));
    const body = await call("domains.getList", {
      ListType: options.listType ?? "ALL",
      SearchTerm: options.searchTerm?.trim() || undefined,
      Page: options.page ?? 1,
      PageSize: pageSize,
      SortBy: options.sortBy ?? "NAME",
    });
    return parseDomainList(body);
  }

  async function listAllDomains(options: Omit<ListDomainsOptions, "page" | "pageSize"> = {}): Promise<Domain[]> {
    const seen = new Set<string>();
    const domains: Domain[] = [];
    for (let page = 1; page <= MAX_PAGES; page++) {
      const result = await listDomains({ ...options, page, pageSize: MAX_PAGE_SIZE });
      for (const domain of result.domains) {
        const key = domain.id || domain.name;
        if (seen.has(key)) continue;
        seen.add(key);
        domains.push(domain);
      }
      if (result.domains.length === 0 || domains.length >= result.totalItems) break;
    }
    return domains;
  }

  async function checkDomains(domains: string[]): Promise<DomainCheckResult[]> {
    const requested = [...new Set(domains.map((domain) => domain.trim().toLowerCase()).filter(Boolean))];
    if (requested.length === 0) return [];

    const byDomain = new Map<string, DomainCheckResult>();
    for (let index = 0; index < requested.length; index += MAX_CHECK_DOMAINS) {
      const chunk = requested.slice(index, index + MAX_CHECK_DOMAINS);
      const body = await call("domains.check", { DomainList: chunk.join(",") });
      for (const result of parseDomainCheck(body)) byDomain.set(result.domain, result);
    }

    return requested.map(
      (domain) =>
        byDomain.get(domain) ?? {
          domain,
          available: false,
          errorNo: -1,
          description: "Namecheap returned no result for this domain",
          isPremium: false,
          premiumRegistrationPrice: 0,
          premiumRenewalPrice: 0,
          icannFee: 0,
          eapFee: 0,
        },
    );
  }

  async function getRegisterPricing(): Promise<PricingTable> {
    const body = await call("users.getPricing", {
      ProductType: "DOMAIN",
      ProductCategory: "DOMAINS",
      ActionName: "REGISTER",
    });
    return parsePricing(body, "REGISTER");
  }

  return { endpoint, environment, call, listDomains, listAllDomains, checkDomains, getRegisterPricing };
}
