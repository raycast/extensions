/**
 * PageSpeedService.ts
 *
 * Communicates with the Google PageSpeed Insights API v5.
 *
 * Changes vs v1:
 *  - Fully typed Lighthouse response (no `any` casts)
 *  - AbortController timeout (30 s) so the spinner never hangs
 *  - Automatic single retry on transient network / 5xx failures
 *  - Fixed INP audit id: "interaction-to-next-paint"
 *  - MAX_AUDITS constant replaces every magic-number 5
 *  - Strategy imported from shared types.ts and re-exported
 */

import { Metrics, type MetricsData, type AuditItem, type ResourceBreakdownItem } from "../models/Metrics";
import type { Strategy } from "../types";

// Re-export so existing callers keep working without import changes.
export type { Strategy };

// ── Typed Lighthouse API shapes ───────────────────────────────────

interface LighthouseAudit {
  title: string;
  description?: string;
  score: number | null;
  numericValue?: number;
  displayValue?: string;
  details?: { type: string; items?: Record<string, unknown>[] };
}

interface LighthouseAuditRef {
  id: string;
  weight?: number;
  group?: string;
}

interface LighthouseCategory {
  id: string;
  title: string;
  score: number | null;
  auditRefs: LighthouseAuditRef[];
}

interface LighthouseResult {
  audits: Record<string, LighthouseAudit>;
  categories: {
    performance?: LighthouseCategory;
    accessibility?: LighthouseCategory;
    "best-practices"?: LighthouseCategory;
    seo?: LighthouseCategory;
  };
}

interface PageSpeedApiResponse {
  lighthouseResult: LighthouseResult;
}

// ── Service ───────────────────────────────────────────────────────

export class PageSpeedService {
  private static readonly BASE_URL = "https://www.googleapis.com/pagespeedonline/v5/runPagespeed";

  /** Max opportunities / diagnostics surfaced per section. */
  private static readonly MAX_AUDITS = 5;

  /** Per-request fetch timeout in milliseconds. */
  private static readonly TIMEOUT_MS = 30_000;

  /** Delay before the single automatic retry (ms). */
  private static readonly RETRY_DELAY_MS = 1_000;

  private readonly apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  // ── Public API ────────────────────────────────────────────────

  async fetchMetrics(url: string, strategy: Strategy): Promise<Metrics> {
    return this.withRetry(() => this.doFetch(url, strategy));
  }

  // ── Private helpers ───────────────────────────────────────────

  /** Single fetch attempt with AbortController timeout. */
  private async doFetch(url: string, strategy: Strategy): Promise<Metrics> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), PageSpeedService.TIMEOUT_MS);
    try {
      const response = await fetch(this.buildEndpoint(url, strategy), {
        signal: controller.signal,
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as {
          error?: { message?: string };
        } | null;
        const detail = body?.error?.message ?? response.statusText;
        throw new Error(`PageSpeed API error (${response.status}): ${detail}`);
      }
      const data = (await response.json()) as PageSpeedApiResponse;
      return this.parseResponse(data);
    } catch (err) {
      if ((err as Error).name === "AbortError") {
        throw new Error("Request timed out after 30 s — check your connection and try again.");
      }
      throw err;
    } finally {
      clearTimeout(timer);
    }
  }

  /**
   * Retries fn once on transient failures (network errors or 5xx).
   * Validation / 4xx errors and timeouts are NOT retried.
   */
  private async withRetry<T>(fn: () => Promise<T>): Promise<T> {
    try {
      return await fn();
    } catch (err) {
      const msg = (err as Error).message ?? "";
      const name = (err as Error).name ?? "";
      const isTransient =
        (name === "TypeError" && msg.toLowerCase().includes("fetch")) || /\b(500|502|503|504)\b/.test(msg);
      if (isTransient) {
        await new Promise((r) => setTimeout(r, PageSpeedService.RETRY_DELAY_MS));
        return fn();
      }
      throw err;
    }
  }

  private buildEndpoint(url: string, strategy: Strategy): string {
    const params = new URLSearchParams({ url, key: this.apiKey, strategy });
    for (const cat of ["performance", "accessibility", "best-practices", "seo"]) {
      params.append("category", cat);
    }
    return `${PageSpeedService.BASE_URL}?${params.toString()}`;
  }

  private parseResponse(data: PageSpeedApiResponse): Metrics {
    const lighthouse = data.lighthouseResult;
    if (!lighthouse) {
      throw new Error("Unexpected API response: missing lighthouseResult");
    }

    const audits = lighthouse.audits ?? {};
    const categories = lighthouse.categories ?? {};

    const numericAudit = (id: string): number => audits[id]?.numericValue ?? 0;

    // Resource summary
    const resourceItems = (audits["resource-summary"]?.details?.items ?? []) as Array<{
      label?: string;
      resourceType?: string;
      requestCount?: number;
      transferSize?: number;
    }>;
    const totalRow = resourceItems[0] ?? {};
    const resourceBreakdown: ResourceBreakdownItem[] = resourceItems
      .slice(1)
      .filter((item) => (item.requestCount ?? 0) > 0)
      .map((item) => ({
        resourceType: item.label ?? item.resourceType ?? "Other",
        requestCount: item.requestCount ?? 0,
        transferSize: item.transferSize ?? 0,
      }));

    const renderBlockingItems = (audits["render-blocking-resources"]?.details?.items ?? []) as unknown[];

    const metricsData: MetricsData = {
      performanceScore: categories.performance?.score ?? 0,
      accessibilityScore: categories.accessibility?.score ?? 0,
      bestPracticesScore: categories["best-practices"]?.score ?? 0,
      seoScore: categories.seo?.score ?? 0,

      fcpMs: numericAudit("first-contentful-paint"),
      lcpMs: numericAudit("largest-contentful-paint"),
      clsValue: numericAudit("cumulative-layout-shift"),
      ttfbMs: numericAudit("server-response-time"),
      ttiMs: numericAudit("interactive"),
      speedIndexMs: numericAudit("speed-index"),
      tbtMs: numericAudit("total-blocking-time"),
      // Fixed: was "experimental-interaction-to-next-paint" (old Lighthouse id)
      inpMs: numericAudit("interaction-to-next-paint"),
      domSize: numericAudit("dom-size"),
      renderBlockingCount: renderBlockingItems.length,

      totalRequests: totalRow.requestCount ?? 0,
      totalSizeBytes: totalRow.transferSize ?? 0,

      opportunities: this.extractAudits(lighthouse, "opportunity", audits),
      diagnostics: this.extractAudits(lighthouse, "diagnostic", audits),
      resourceBreakdown,
    };

    return new Metrics(metricsData);
  }

  private extractAudits(
    lighthouse: LighthouseResult,
    group: string,
    audits: Record<string, LighthouseAudit>,
  ): AuditItem[] {
    const auditRefs = lighthouse.categories?.performance?.auditRefs ?? [];
    return auditRefs
      .filter((ref) => ref.group === group)
      .map((ref) => {
        const audit = audits[ref.id];
        if (!audit || audit.score === 1) return null;
        return {
          title: audit.title ?? ref.id,
          displayValue: audit.displayValue ?? "",
          score: audit.score ?? null,
        } as AuditItem;
      })
      .filter((item): item is AuditItem => item !== null)
      .sort((a, b) => (a.score ?? 0) - (b.score ?? 0))
      .slice(0, PageSpeedService.MAX_AUDITS);
  }
}
