/**
 * Formatter.ts
 *
 * Pure static utility class — no state, no side-effects.
 * Handles all presentation-layer formatting so neither the Metrics
 * model nor the React UI need to know about display concerns.
 */

import { Color, Icon, Image } from "@raycast/api";
import type { Strategy } from "../types";
import type { Metrics } from "../models/Metrics";

/** Supported Core Web Vital metric names for threshold checks. */
export type MetricName = "fcp" | "lcp" | "cls" | "ttfb" | "tti" | "tbt" | "inp" | "speedIndex";

/**
 * Official Lighthouse thresholds: [good, needsImprovement].
 * value <= good → Green, <= needsImprovement → Yellow, else → Red.
 */
const METRIC_THRESHOLDS: Record<MetricName, [number, number]> = {
  fcp: [1800, 3000],
  lcp: [2500, 4000],
  cls: [0.1, 0.25],
  ttfb: [800, 1800],
  tti: [3800, 7300],
  tbt: [200, 600],
  inp: [200, 500],
  speedIndex: [3400, 5800],
};

export class Formatter {
  // ── Time ───────────────────────────────────────────────────────

  static toReadableTime(ms: number): string {
    if (ms >= 1000) return `${(ms / 1000).toFixed(1)} s`;
    return `${Math.round(ms)} ms`;
  }

  // ── Score ──────────────────────────────────────────────────────

  static toScoreColor(score: number): Color {
    if (score >= 90) return Color.Green;
    if (score >= 50) return Color.Yellow;
    return Color.Red;
  }

  static toScoreLabel(score: number): string {
    if (score >= 90) return "Good";
    if (score >= 50) return "Needs Improvement";
    return "Poor";
  }

  static toScoreIcon(score: number): Image {
    if (score >= 90) return { source: Icon.CheckCircle, tintColor: Color.Green };
    if (score >= 50) return { source: Icon.Warning, tintColor: Color.Yellow };
    return { source: Icon.XMarkCircle, tintColor: Color.Red };
  }

  // ── Per-metric threshold ───────────────────────────────────────

  static toMetricIcon(metric: MetricName, value: number): Image {
    const [good, mid] = METRIC_THRESHOLDS[metric];
    if (value <= good) return { source: Icon.CheckCircle, tintColor: Color.Green };
    if (value <= mid) return { source: Icon.Warning, tintColor: Color.Yellow };
    return { source: Icon.XMarkCircle, tintColor: Color.Red };
  }

  static toMetricColor(metric: MetricName, value: number): Color {
    const [good, mid] = METRIC_THRESHOLDS[metric];
    if (value <= good) return Color.Green;
    if (value <= mid) return Color.Yellow;
    return Color.Red;
  }

  static toMetricRating(metric: MetricName, value: number): string {
    const [good, mid] = METRIC_THRESHOLDS[metric];
    if (value <= good) return "Good";
    if (value <= mid) return "Needs Improvement";
    return "Poor";
  }

  // ── URL helpers ────────────────────────────────────────────────

  static normalizeUrl(url: string): string {
    const trimmed = url.trim();
    if (!trimmed) return trimmed;
    if (/^https?:\/\//i.test(trimmed)) return trimmed;
    return `https://${trimmed}`;
  }

  /**
   * Returns true when the string resolves to a valid public URL
   * (i.e. the hostname contains at least one dot).
   */
  static isValidUrl(url: string): boolean {
    const normalized = this.normalizeUrl(url);
    if (!normalized) return false;
    try {
      const { hostname } = new URL(normalized);
      return hostname.includes(".") && !hostname.endsWith(".");
    } catch {
      return false;
    }
  }

  static extractHostname(url: string): string {
    try {
      return new URL(this.normalizeUrl(url)).hostname;
    } catch {
      return url;
    }
  }

  // ── Size ───────────────────────────────────────────────────────

  static toReadableSize(bytes: number): string {
    if (bytes === 0) return "0 B";
    const units = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${units[i]}`;
  }

  static toReadableCls(value: number): string {
    return value.toFixed(3);
  }

  static toFormattedNumber(value: number): string {
    return value.toLocaleString();
  }

  // ── Delta (trend) ──────────────────────────────────────────────

  /** Formats a score delta as "▲12", "▼3", or "—" for no change. */
  static toDeltaLabel(delta: number): string {
    if (delta > 0) return `▲${delta}`;
    if (delta < 0) return `▼${Math.abs(delta)}`;
    return "—";
  }

  static toDeltaColor(delta: number): Color {
    if (delta > 0) return Color.Green;
    if (delta < 0) return Color.Red;
    return Color.SecondaryText;
  }

  // ── Markdown report ────────────────────────────────────────────

  static toMarkdownReport(metrics: Metrics, url: string, strategy: Strategy): string {
    const strategyLabel = strategy === "mobile" ? "Mobile" : "Desktop";
    const now = new Date().toLocaleString();

    const lines: string[] = [
      "# Web Metrics Report",
      "",
      `**URL:** ${url}`,
      `**Strategy:** ${strategyLabel}`,
      `**Analyzed at:** ${now}`,
      "",
      "---",
      "",
      "## Scores",
      "",
      "| Category | Score | Rating |",
      "|---|---|---|",
      `| Performance | ${metrics.performanceScore}/100 | ${this.toScoreLabel(metrics.performanceScore)} |`,
      `| Accessibility | ${metrics.accessibilityScore}/100 | ${this.toScoreLabel(metrics.accessibilityScore)} |`,
      `| Best Practices | ${metrics.bestPracticesScore}/100 | ${this.toScoreLabel(metrics.bestPracticesScore)} |`,
      `| SEO | ${metrics.seoScore}/100 | ${this.toScoreLabel(metrics.seoScore)} |`,
      "",
      "## Core Web Vitals",
      "",
      "| Metric | Value |",
      "|---|---|",
      `| First Contentful Paint (FCP) | ${this.toReadableTime(metrics.fcp)} |`,
      `| Largest Contentful Paint (LCP) | ${this.toReadableTime(metrics.lcp)} |`,
      `| Cumulative Layout Shift (CLS) | ${this.toReadableCls(metrics.cls)} |`,
      `| Time to First Byte (TTFB) | ${this.toReadableTime(metrics.ttfb)} |`,
      `| Time to Interactive (TTI) | ${this.toReadableTime(metrics.tti)} |`,
      `| Total Blocking Time (TBT) | ${this.toReadableTime(metrics.tbt)} |`,
      `| Speed Index | ${this.toReadableTime(metrics.speedIndex)} |`,
    ];

    if (metrics.inp > 0) {
      lines.push(`| Interaction to Next Paint (INP) | ${this.toReadableTime(metrics.inp)} |`);
    }

    lines.push(
      "",
      "## Page Weight",
      "",
      "| Metric | Value |",
      "|---|---|",
      `| Total Requests | ${this.toFormattedNumber(metrics.totalRequests)} |`,
      `| Total Transfer Size | ${this.toReadableSize(metrics.totalSizeBytes)} |`,
      `| DOM Elements | ${this.toFormattedNumber(metrics.domSize)} |`,
    );

    if (metrics.renderBlockingCount > 0) {
      lines.push(`| Render-Blocking Resources | ${metrics.renderBlockingCount} |`);
    }

    if (metrics.resourceBreakdown.length > 0) {
      lines.push("", "## Resource Breakdown", "", "| Type | Requests | Transfer Size |", "|---|---|---|");
      for (const r of metrics.resourceBreakdown) {
        lines.push(`| ${r.resourceType} | ${r.requestCount} | ${this.toReadableSize(r.transferSize)} |`);
      }
    }

    if (metrics.opportunities.length > 0) {
      lines.push("", "## Opportunities", "");
      for (const o of metrics.opportunities) {
        lines.push(`- **${o.title}**${o.displayValue ? ` — ${o.displayValue}` : ""}`);
      }
    }

    if (metrics.diagnostics.length > 0) {
      lines.push("", "## Diagnostics", "");
      for (const d of metrics.diagnostics) {
        lines.push(`- **${d.title}**${d.displayValue ? ` — ${d.displayValue}` : ""}`);
      }
    }

    lines.push("", "---", "*Generated by Web Metrics for Raycast*");
    return lines.join("\n");
  }
}
