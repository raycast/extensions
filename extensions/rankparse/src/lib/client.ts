import { getPreferenceValues } from "@raycast/api";
import { APIError, AuthError, InsufficientCreditsError, NotFoundError, RateLimitError } from "rankparse";
import type {
  AnchorTextRow,
  ApiResponse,
  BacklinkRow,
  BatchResultItem,
  CompetitorGapRow,
  CreditsResponse,
  CrawlHistoryData,
  DomainAuthorityData,
  DomainOverlapRow,
  DomainRankData,
  LinkAuditData,
  LinkIntersectRow,
  OutboundLinkRow,
  PagePerformanceData,
  PageSeoData,
  ReferringDomainRow,
  SimilarDomainRow,
  SiteExplorerData,
  SiteHealthData,
  SitemapResponse,
  TechStackData,
  TopPageRow,
  UsageResponse,
} from "./types";

interface RequestOptions {
  limit?: number;
  offset?: number;
}

interface BacklinksOptions extends RequestOptions {
  sort?: "importance" | "recent";
  from_domain?: string;
  link_type?: string;
}

type QueryValue = string | number | boolean | undefined;

const API_BASE = "https://api.rankparse.com/v1";
const REQUEST_TIMEOUT_MS = 30_000;

export class RankParseClient {
  constructor(private readonly apiKey: string) {}

  private async request<T>(method: "GET" | "POST", path: string, params?: Record<string, QueryValue>, body?: unknown) {
    if (!this.apiKey) throw new AuthError("Add a RankParse API key in extension preferences.", "missing_api_key");

    const url = new URL(`${API_BASE}${path}`);
    if (params) {
      for (const [key, value] of Object.entries(params)) {
        if (value !== undefined) url.searchParams.set(key, String(value));
      }
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const response = await fetch(url.toString(), {
        method,
        headers: {
          Accept: "application/json",
          "X-API-Key": this.apiKey,
          ...(body === undefined ? {} : { "Content-Type": "application/json" }),
        },
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: controller.signal,
      });

      if (!response.ok) {
        let errorCode = "unknown_error";
        let errorMessage = `HTTP ${response.status}`;
        try {
          const errorBody = (await response.json()) as { error?: string; code?: string; message?: string };
          errorCode = errorBody.code ?? errorBody.error ?? errorCode;
          errorMessage = errorBody.message ?? errorBody.error ?? errorMessage;
        } catch {
          // Keep the HTTP status message when the API does not return JSON.
        }

        switch (response.status) {
          case 401:
          case 403:
            throw new AuthError(errorMessage, errorCode);
          case 402:
            throw new InsufficientCreditsError(errorMessage, errorCode);
          case 404:
            throw new NotFoundError(errorMessage, errorCode);
          case 429:
            throw new RateLimitError(errorMessage, errorCode);
          default:
            throw new APIError(errorMessage, errorCode, response.status);
        }
      }

      return (await response.json()) as T;
    } catch (error) {
      if (
        error instanceof APIError ||
        error instanceof AuthError ||
        error instanceof InsufficientCreditsError ||
        error instanceof NotFoundError ||
        error instanceof RateLimitError
      ) {
        throw error;
      }
      if (error instanceof Error && error.name === "AbortError") {
        throw new APIError(`Request timed out after ${REQUEST_TIMEOUT_MS}ms`, "timeout", 0);
      }
      throw new APIError(error instanceof Error ? error.message : "Network request failed", "network_error", 0);
    } finally {
      clearTimeout(timeout);
    }
  }

  private get<T>(path: string, params?: Record<string, QueryValue>) {
    return this.request<T>("GET", path, params);
  }

  private post<T>(path: string, body: unknown) {
    return this.request<T>("POST", path, undefined, body);
  }

  backlinks(domain: string, options?: BacklinksOptions) {
    return this.get<ApiResponse<BacklinkRow[]>>("/backlinks", {
      domain,
      limit: options?.limit,
      offset: options?.offset,
      sort: options?.sort,
      from_domain: options?.from_domain,
      link_type: options?.link_type,
    });
  }

  referringDomains(domain: string, options?: RequestOptions) {
    return this.get<ApiResponse<ReferringDomainRow[]>>("/referring-domains", {
      domain,
      limit: options?.limit,
      offset: options?.offset,
    });
  }

  outboundLinks(domain: string, options?: RequestOptions) {
    return this.get<ApiResponse<OutboundLinkRow[]>>("/outbound-links", {
      domain,
      limit: options?.limit,
      offset: options?.offset,
    });
  }

  anchorText(domain: string, options?: RequestOptions) {
    return this.get<ApiResponse<AnchorTextRow[]>>("/anchor-text", {
      domain,
      limit: options?.limit,
      offset: options?.offset,
    });
  }

  topPages(domain: string, options?: RequestOptions) {
    return this.get<ApiResponse<TopPageRow[]>>("/top-pages", {
      domain,
      limit: options?.limit,
      offset: options?.offset,
    });
  }

  domainAuthority(domain: string) {
    return this.get<ApiResponse<DomainAuthorityData>>("/domain-authority", { domain });
  }

  domainRank(domain: string) {
    return this.get<ApiResponse<DomainRankData>>("/domain-rank", { domain });
  }

  domainOverlap(domains: string[], options?: RequestOptions) {
    return this.get<ApiResponse<DomainOverlapRow[]>>("/domain-overlap", {
      domains: domains.join(","),
      limit: options?.limit,
      offset: options?.offset,
    });
  }

  linkIntersect(domainA: string, domainB: string, options?: RequestOptions) {
    return this.get<ApiResponse<LinkIntersectRow[]>>("/link-intersect", {
      domain_a: domainA,
      domain_b: domainB,
      limit: options?.limit,
      offset: options?.offset,
    });
  }

  competitorGap(domain: string, vs: string, options?: RequestOptions) {
    return this.get<ApiResponse<CompetitorGapRow[]>>("/competitor-gap", {
      domain,
      vs,
      limit: options?.limit,
      offset: options?.offset,
    });
  }

  similarDomains(domain: string, options?: RequestOptions) {
    return this.get<ApiResponse<SimilarDomainRow[]>>("/similar-domains", {
      domain,
      limit: options?.limit,
      offset: options?.offset,
    });
  }

  async linkAudit(domain: string) {
    const raw = await this.get<
      LinkAuditData & {
        domain: string;
        credits_used: number;
        credits_remaining: number;
        crawl_release?: string;
        cached?: boolean;
      }
    >("/link-audit", { domain });
    const { credits_used, credits_remaining, crawl_release, cached, domain: responseDomain, ...data } = raw;
    return {
      domain: responseDomain,
      data,
      credits_used,
      credits_remaining,
      crawl_release,
      cached,
    } satisfies ApiResponse<LinkAuditData>;
  }

  siteExplorer(domain: string) {
    return this.get<ApiResponse<SiteExplorerData>>("/site-explorer", { domain });
  }

  pageSeo(url: string) {
    return this.get<ApiResponse<PageSeoData>>("/page-seo", { url });
  }

  pagePerformance(url: string, options?: { strategy?: "mobile" | "desktop" }) {
    return this.get<ApiResponse<PagePerformanceData>>("/page-performance", {
      url,
      strategy: options?.strategy,
    });
  }

  techStack(domain: string) {
    return this.get<ApiResponse<TechStackData>>("/tech-stack", { domain });
  }

  siteHealth(domain: string) {
    return this.get<ApiResponse<SiteHealthData>>("/site-health", { domain });
  }

  sitemap(domain: string, options?: RequestOptions) {
    return this.get<SitemapResponse>("/sitemap", {
      domain,
      limit: options?.limit,
      offset: options?.offset,
    });
  }

  crawlHistory(domain: string, options?: RequestOptions) {
    return this.get<ApiResponse<CrawlHistoryData>>("/crawl-history", {
      domain,
      limit: options?.limit,
      offset: options?.offset,
    });
  }

  credits() {
    return this.get<CreditsResponse>("/credits");
  }

  usage(options?: RequestOptions) {
    return this.get<UsageResponse>("/usage", {
      limit: options?.limit,
      offset: options?.offset,
    });
  }

  batchBacklinks(domains: string[]) {
    return this.post<ApiResponse<BatchResultItem[]>>("/batch", { domains });
  }
}

export function getClient(): RankParseClient {
  const { apiKey } = getPreferenceValues<Preferences>();
  return new RankParseClient(apiKey);
}
