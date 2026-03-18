/**
 * Metrics.ts
 *
 * Data models for PageSpeed Insights API responses.
 * Separates the raw API shape (MetricsData) from the domain
 * object (Metrics) that exposes convenient typed getters.
 *
 * ReportSnapshot is a lightweight snapshot of scores + vitals
 * persisted by ReportService for trend-delta computation.
 */

import type { Strategy } from "../types";

// ── Sub-interfaces ──────────────────────────────────────────────────

/** A single Lighthouse opportunity or diagnostic audit. */
export interface AuditItem {
  title: string;
  displayValue: string;
  score: number | null;
}

/** A row from the resource-summary audit (scripts, images, etc.) */
export interface ResourceBreakdownItem {
  resourceType: string;
  requestCount: number;
  transferSize: number;
}

// ── Snapshot for trend tracking ─────────────────────────────────────

export interface ReportSnapshot {
  url: string;
  strategy: Strategy;
  /** Unix timestamp (ms) when this run completed. */
  timestamp: number;
  scores: {
    performance: number;
    accessibility: number;
    bestPractices: number;
    seo: number;
  };
  vitals: {
    fcpMs: number;
    lcpMs: number;
    clsValue: number;
    ttfbMs: number;
    ttiMs: number;
    tbtMs: number;
    speedIndexMs: number;
    inpMs: number;
  };
}

// ── Raw API response shape ──────────────────────────────────────────

export interface MetricsData {
  // Category scores (0 – 1 from API)
  performanceScore: number;
  accessibilityScore: number;
  bestPracticesScore: number;
  seoScore: number;

  // Core Web Vitals (ms / unitless)
  fcpMs: number;
  lcpMs: number;
  clsValue: number;
  ttfbMs: number;
  ttiMs: number;
  speedIndexMs: number;

  // Additional performance metrics
  tbtMs: number;
  inpMs: number;
  domSize: number;
  renderBlockingCount: number;

  // Page weight
  totalRequests: number;
  totalSizeBytes: number;

  // Audits
  opportunities: AuditItem[];
  diagnostics: AuditItem[];
  resourceBreakdown: ResourceBreakdownItem[];
}

// ── Domain model ────────────────────────────────────────────────────

export class Metrics {
  private readonly data: MetricsData;

  constructor(data: MetricsData) {
    this.data = data;
  }

  // Category scores scaled to 0-100
  get performanceScore(): number {
    return Math.round(this.data.performanceScore * 100);
  }
  get accessibilityScore(): number {
    return Math.round(this.data.accessibilityScore * 100);
  }
  get bestPracticesScore(): number {
    return Math.round(this.data.bestPracticesScore * 100);
  }
  get seoScore(): number {
    return Math.round(this.data.seoScore * 100);
  }

  // Core Web Vitals (raw values)
  get fcp(): number {
    return this.data.fcpMs;
  }
  get lcp(): number {
    return this.data.lcpMs;
  }
  get cls(): number {
    return this.data.clsValue;
  }
  get ttfb(): number {
    return this.data.ttfbMs;
  }
  get tti(): number {
    return this.data.ttiMs;
  }
  get speedIndex(): number {
    return this.data.speedIndexMs;
  }
  get tbt(): number {
    return this.data.tbtMs;
  }
  get inp(): number {
    return this.data.inpMs;
  }

  // Page metadata
  get domSize(): number {
    return this.data.domSize;
  }
  get renderBlockingCount(): number {
    return this.data.renderBlockingCount;
  }
  get totalRequests(): number {
    return this.data.totalRequests;
  }
  get totalSizeBytes(): number {
    return this.data.totalSizeBytes;
  }

  // Audits
  get opportunities(): AuditItem[] {
    return this.data.opportunities;
  }
  get diagnostics(): AuditItem[] {
    return this.data.diagnostics;
  }
  get resourceBreakdown(): ResourceBreakdownItem[] {
    return this.data.resourceBreakdown;
  }

  /** Converts this instance into a lightweight snapshot for persistence. */
  toSnapshot(url: string, strategy: Strategy): ReportSnapshot {
    return {
      url,
      strategy,
      timestamp: Date.now(),
      scores: {
        performance: this.performanceScore,
        accessibility: this.accessibilityScore,
        bestPractices: this.bestPracticesScore,
        seo: this.seoScore,
      },
      vitals: {
        fcpMs: this.data.fcpMs,
        lcpMs: this.data.lcpMs,
        clsValue: this.data.clsValue,
        ttfbMs: this.data.ttfbMs,
        ttiMs: this.data.ttiMs,
        tbtMs: this.data.tbtMs,
        speedIndexMs: this.data.speedIndexMs,
        inpMs: this.data.inpMs,
      },
    };
  }
}
