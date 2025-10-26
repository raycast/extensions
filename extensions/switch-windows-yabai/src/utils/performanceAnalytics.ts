/**
 * Advanced performance analytics and monitoring system
 * Provides detailed insights into application performance
 */

import { performanceMonitor } from "./performanceMonitor";
import { configManager } from "./configManager";
import { storageManager } from "./batchedStorage";

interface PerformanceMetrics {
  timestamp: number;
  operation: string;
  duration: number;
  memory?: number;
  userAgent?: string;
  context?: Record<string, unknown>;
}

interface PerformanceReport {
  summary: {
    totalOperations: number;
    averageResponseTime: number;
    memoryUsage: number;
    cacheHitRate: number;
    errorRate: number;
  };
  operations: Record<
    string,
    {
      count: number;
      avgDuration: number;
      minDuration: number;
      maxDuration: number;
      p95Duration: number;
      successRate: number;
    }
  >;
  trends: {
    performanceOverTime: Array<{
      timestamp: number;
      avgDuration: number;
      memoryUsage: number;
    }>;
    topBottlenecks: Array<{
      operation: string;
      avgDuration: number;
      frequency: number;
      impact: number;
    }>;
  };
  recommendations: string[];
}

class PerformanceAnalytics {
  private metrics: PerformanceMetrics[] = [];
  private readonly maxMetrics = 1000;
  private reportCache: PerformanceReport | null = null;
  private lastReportTime = 0;
  private readonly reportCacheTimeout = 30000; // 30 seconds

  constructor() {
    this.setupMemoryMonitoring();
    this.loadStoredMetrics();
  }

  private setupMemoryMonitoring(): void {
    if (typeof performance.memory !== "undefined") {
      setInterval(() => {
        this.recordMetric("memory-check", 0, {
          memory: performance.memory.usedJSHeapSize,
          heapLimit: performance.memory.jsHeapSizeLimit,
        });
      }, 60000); // Every minute
    }
  }

  private async loadStoredMetrics(): Promise<void> {
    try {
      const stored = await storageManager.get<PerformanceMetrics[]>("performance-metrics");
      if (stored && Array.isArray(stored)) {
        this.metrics = stored.slice(-this.maxMetrics);
      }
    } catch (error) {
      console.error("Failed to load stored metrics:", error);
    }
  }

  private async saveMetrics(): Promise<void> {
    try {
      // Keep only recent metrics to prevent storage bloat
      const recentMetrics = this.metrics.slice(-this.maxMetrics);
      await storageManager.set("performance-metrics", recentMetrics);
    } catch (error) {
      console.error("Failed to save metrics:", error);
    }
  }

  recordMetric(operation: string, duration: number, context?: Record<string, unknown>): void {
    const metric: PerformanceMetrics = {
      timestamp: Date.now(),
      operation,
      duration,
      context,
      userAgent: typeof navigator !== "undefined" ? navigator.userAgent : undefined,
    };

    if (typeof performance.memory !== "undefined") {
      metric.memory = performance.memory.usedJSHeapSize;
    }

    this.metrics.push(metric);

    // Maintain maximum metrics limit
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics);
    }

    // Periodically save metrics
    if (this.metrics.length % 50 === 0) {
      this.saveMetrics();
    }

    // Clear report cache
    this.reportCache = null;
  }

  generateReport(timeWindow?: number): PerformanceReport {
    // Use cached report if available and recent
    const now = Date.now();
    if (this.reportCache && now - this.lastReportTime < this.reportCacheTimeout) {
      return this.reportCache;
    }

    const windowStart = timeWindow ? now - timeWindow : 0;
    const relevantMetrics = this.metrics.filter((m) => m.timestamp > windowStart);

    if (relevantMetrics.length === 0) {
      return this.getEmptyReport();
    }

    const report = this.buildReport(relevantMetrics);

    // Cache the report
    this.reportCache = report;
    this.lastReportTime = now;

    return report;
  }

  private buildReport(metrics: PerformanceMetrics[]): PerformanceReport {
    const operations = this.groupMetricsByOperation(metrics);
    const summary = this.calculateSummary(metrics);
    const trends = this.analyzeTrends(metrics);
    const recommendations = this.generateRecommendations(summary, operations, trends);

    return {
      summary,
      operations,
      trends,
      recommendations,
    };
  }

  private groupMetricsByOperation(metrics: PerformanceMetrics[]): Record<
    string,
    {
      count: number;
      avgDuration: number;
      minDuration: number;
      maxDuration: number;
      p95Duration: number;
      successRate: number;
    }
  > {
    const grouped: Record<string, number[]> = {};

    metrics.forEach((metric) => {
      if (!grouped[metric.operation]) {
        grouped[metric.operation] = [];
      }
      grouped[metric.operation].push(metric.duration);
    });

    const result: Record<string, unknown> = {};

    Object.entries(grouped).forEach(([operation, durations]) => {
      const sorted = durations.sort((a, b) => a - b);
      const sum = durations.reduce((acc, val) => acc + val, 0);

      result[operation] = {
        count: durations.length,
        avgDuration: sum / durations.length,
        minDuration: sorted[0],
        maxDuration: sorted[sorted.length - 1],
        p95Duration: sorted[Math.floor(sorted.length * 0.95)] || sorted[sorted.length - 1],
        successRate: 1.0, // TODO: Track failures
      };
    });

    return result;
  }

  private calculateSummary(metrics: PerformanceMetrics[]): PerformanceReport["summary"] {
    const totalDuration = metrics.reduce((sum, m) => sum + m.duration, 0);
    const avgResponseTime = metrics.length > 0 ? totalDuration / metrics.length : 0;

    const memoryMetrics = metrics.filter((m) => m.memory !== undefined);
    const avgMemory =
      memoryMetrics.length > 0 ? memoryMetrics.reduce((sum, m) => sum + (m.memory || 0), 0) / memoryMetrics.length : 0;

    // Calculate cache hit rate (approximation based on operation types)
    const cacheOperations = metrics.filter(
      (m) => m.operation.includes("cache-hit") || m.operation.includes("cache-miss"),
    );
    const cacheHits = metrics.filter((m) => m.operation.includes("cache-hit")).length;
    const cacheHitRate = cacheOperations.length > 0 ? cacheHits / cacheOperations.length : 0;

    return {
      totalOperations: metrics.length,
      averageResponseTime: avgResponseTime,
      memoryUsage: avgMemory,
      cacheHitRate,
      errorRate: 0, // TODO: Track errors
    };
  }

  private analyzeTrends(metrics: PerformanceMetrics[]): PerformanceReport["trends"] {
    // Group metrics by time buckets (e.g., 5-minute intervals)
    const bucketSize = 5 * 60 * 1000; // 5 minutes
    const buckets: Record<number, PerformanceMetrics[]> = {};

    metrics.forEach((metric) => {
      const bucketTime = Math.floor(metric.timestamp / bucketSize) * bucketSize;
      if (!buckets[bucketTime]) {
        buckets[bucketTime] = [];
      }
      buckets[bucketTime].push(metric);
    });

    const performanceOverTime = Object.entries(buckets)
      .map(([timestamp, bucketMetrics]) => {
        const avgDuration = bucketMetrics.reduce((sum, m) => sum + m.duration, 0) / bucketMetrics.length;
        const memoryMetrics = bucketMetrics.filter((m) => m.memory !== undefined);
        const avgMemory =
          memoryMetrics.length > 0
            ? memoryMetrics.reduce((sum, m) => sum + (m.memory || 0), 0) / memoryMetrics.length
            : 0;

        return {
          timestamp: parseInt(timestamp),
          avgDuration,
          memoryUsage: avgMemory,
        };
      })
      .sort((a, b) => a.timestamp - b.timestamp);

    // Identify top bottlenecks
    const operationStats: Record<string, { total: number; count: number; maxDuration: number }> = {};

    metrics.forEach((metric) => {
      if (!operationStats[metric.operation]) {
        operationStats[metric.operation] = { total: 0, count: 0, maxDuration: 0 };
      }

      operationStats[metric.operation].total += metric.duration;
      operationStats[metric.operation].count += 1;
      operationStats[metric.operation].maxDuration = Math.max(
        operationStats[metric.operation].maxDuration,
        metric.duration,
      );
    });

    const topBottlenecks = Object.entries(operationStats)
      .map(([operation, stats]) => ({
        operation,
        avgDuration: stats.total / stats.count,
        frequency: stats.count,
        impact: (stats.total / stats.count) * stats.count, // Simple impact score
      }))
      .sort((a, b) => b.impact - a.impact)
      .slice(0, 5);

    return {
      performanceOverTime,
      topBottlenecks,
    };
  }

  private generateRecommendations(
    summary: PerformanceReport["summary"],
    operations: Record<string, unknown>,
    trends: PerformanceReport["trends"],
  ): string[] {
    const recommendations: string[] = [];

    // Memory recommendations
    if (summary.memoryUsage > 100 * 1024 * 1024) {
      // 100MB
      recommendations.push("Consider reducing memory usage - current usage is high");
    }

    // Cache recommendations
    if (summary.cacheHitRate < 0.7) {
      recommendations.push("Low cache hit rate detected - consider optimizing caching strategy");
    }

    // Performance recommendations
    if (summary.averageResponseTime > 100) {
      recommendations.push("Average response time is high - consider optimizing slow operations");
    }

    // Operation-specific recommendations
    Object.entries(operations).forEach(([operation, stats]) => {
      if (stats.avgDuration > 200) {
        recommendations.push(`${operation} is slow (${stats.avgDuration.toFixed(2)}ms avg) - consider optimization`);
      }

      if (stats.count > 50 && stats.avgDuration > 50) {
        recommendations.push(`${operation} is frequently called and moderately slow - high impact optimization target`);
      }
    });

    // Trend-based recommendations
    if (trends.performanceOverTime.length > 2) {
      const recent = trends.performanceOverTime.slice(-3);
      const older = trends.performanceOverTime.slice(0, 3);

      if (recent.length > 0 && older.length > 0) {
        const recentAvg = recent.reduce((sum, r) => sum + r.avgDuration, 0) / recent.length;
        const olderAvg = older.reduce((sum, r) => sum + r.avgDuration, 0) / older.length;

        if (recentAvg > olderAvg * 1.2) {
          recommendations.push("Performance has degraded recently - investigate for regressions");
        }
      }
    }

    return recommendations.length > 0
      ? recommendations
      : ["Performance looks good! No specific recommendations at this time."];
  }

  private getEmptyReport(): PerformanceReport {
    return {
      summary: {
        totalOperations: 0,
        averageResponseTime: 0,
        memoryUsage: 0,
        cacheHitRate: 0,
        errorRate: 0,
      },
      operations: {},
      trends: {
        performanceOverTime: [],
        topBottlenecks: [],
      },
      recommendations: ["No performance data available yet"],
    };
  }

  clearMetrics(): void {
    this.metrics = [];
    this.reportCache = null;
    this.saveMetrics();
  }

  exportMetrics(): PerformanceMetrics[] {
    return [...this.metrics];
  }

  getMetricsSummary(): {
    totalMetrics: number;
    oldestMetric: number;
    newestMetric: number;
    operationTypes: string[];
  } {
    if (this.metrics.length === 0) {
      return {
        totalMetrics: 0,
        oldestMetric: 0,
        newestMetric: 0,
        operationTypes: [],
      };
    }

    const timestamps = this.metrics.map((m) => m.timestamp);
    const operations = [...new Set(this.metrics.map((m) => m.operation))];

    return {
      totalMetrics: this.metrics.length,
      oldestMetric: Math.min(...timestamps),
      newestMetric: Math.max(...timestamps),
      operationTypes: operations,
    };
  }

  // Integration with existing performance monitor
  integrateWithMonitor(): void {
    const originalRecordMetric = performanceMonitor.recordMetric.bind(performanceMonitor);

    performanceMonitor.recordMetric = (operation: string, duration: number) => {
      originalRecordMetric(operation, duration);
      this.recordMetric(operation, duration);
    };

    console.log("🔗 Performance analytics integrated with performance monitor");
  }
}

// Export singleton
export const performanceAnalytics = new PerformanceAnalytics();

// Auto-integrate with performance monitor
if (configManager.isFeatureEnabled("usePerformanceMonitoring")) {
  performanceAnalytics.integrateWithMonitor();
}
