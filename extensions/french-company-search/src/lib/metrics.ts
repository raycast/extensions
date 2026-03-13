/**
 * Performance metrics and monitoring utilities
 * Tracks API response times, error rates, and system performance
 */

export interface ApiMetrics {
  endpoint: string;
  method: string;
  responseTime: number;
  statusCode: number;
  success: boolean;
  timestamp: number;
  errorType?: string;
  retryCount?: number;
}

export interface PerformanceStats {
  totalRequests: number;
  successRate: number;
  averageResponseTime: number;
  p95ResponseTime: number;
  p99ResponseTime: number;
  errorsByType: Record<string, number>;
  timeRange: {
    start: number;
    end: number;
  };
}

class MetricsCollector {
  private metrics: ApiMetrics[] = [];
  private maxMetrics = 1000; // Keep last 1000 metrics in memory

  /**
   * Record an API call metric
   */
  recordApiCall(metric: Omit<ApiMetrics, "timestamp">): void {
    const fullMetric: ApiMetrics = {
      ...metric,
      timestamp: Date.now(),
    };

    this.metrics.push(fullMetric);

    // Keep only recent metrics to prevent memory issues
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics);
    }

    // Log performance warnings in development
    if (process.env.NODE_ENV === "development") {
      this.logPerformanceWarnings(fullMetric);
    }
  }

  /**
   * Get performance statistics for a time period
   */
  getStats(timeRangeMs: number = 3600000): PerformanceStats {
    // Default: 1 hour
    const now = Date.now();
    const cutoff = now - timeRangeMs;

    const recentMetrics = this.metrics.filter((m) => m.timestamp >= cutoff);

    if (recentMetrics.length === 0) {
      return this.getEmptyStats(cutoff, now);
    }

    const responseTimes = recentMetrics.map((m) => m.responseTime).sort((a, b) => a - b);
    const successfulCalls = recentMetrics.filter((m) => m.success);
    const errorsByType: Record<string, number> = {};

    // Count errors by type
    recentMetrics
      .filter((m) => !m.success && m.errorType)
      .forEach((m) => {
        errorsByType[m.errorType!] = (errorsByType[m.errorType!] || 0) + 1;
      });

    return {
      totalRequests: recentMetrics.length,
      successRate: (successfulCalls.length / recentMetrics.length) * 100,
      averageResponseTime: responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length,
      p95ResponseTime: this.getPercentile(responseTimes, 0.95),
      p99ResponseTime: this.getPercentile(responseTimes, 0.99),
      errorsByType,
      timeRange: {
        start: cutoff,
        end: now,
      },
    };
  }

  /**
   * Get metrics for specific endpoint
   */
  getEndpointStats(endpoint: string, timeRangeMs: number = 3600000): PerformanceStats {
    const now = Date.now();
    const cutoff = now - timeRangeMs;

    const endpointMetrics = this.metrics.filter((m) => m.timestamp >= cutoff && m.endpoint === endpoint);

    if (endpointMetrics.length === 0) {
      return this.getEmptyStats(cutoff, now);
    }

    const responseTimes = endpointMetrics.map((m) => m.responseTime).sort((a, b) => a - b);
    const successfulCalls = endpointMetrics.filter((m) => m.success);
    const errorsByType: Record<string, number> = {};

    endpointMetrics
      .filter((m) => !m.success && m.errorType)
      .forEach((m) => {
        errorsByType[m.errorType!] = (errorsByType[m.errorType!] || 0) + 1;
      });

    return {
      totalRequests: endpointMetrics.length,
      successRate: (successfulCalls.length / endpointMetrics.length) * 100,
      averageResponseTime: responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length,
      p95ResponseTime: this.getPercentile(responseTimes, 0.95),
      p99ResponseTime: this.getPercentile(responseTimes, 0.99),
      errorsByType,
      timeRange: {
        start: cutoff,
        end: now,
      },
    };
  }

  /**
   * Clear all metrics (useful for testing)
   */
  clear(): void {
    this.metrics = [];
  }

  /**
   * Get recent errors for debugging
   */
  getRecentErrors(count: number = 10): ApiMetrics[] {
    return this.metrics
      .filter((m) => !m.success)
      .slice(-count)
      .reverse();
  }

  private getPercentile(sortedArray: number[], percentile: number): number {
    if (sortedArray.length === 0) return 0;

    const index = Math.ceil(sortedArray.length * percentile) - 1;
    return sortedArray[Math.max(0, index)];
  }

  private getEmptyStats(start: number, end: number): PerformanceStats {
    return {
      totalRequests: 0,
      successRate: 0,
      averageResponseTime: 0,
      p95ResponseTime: 0,
      p99ResponseTime: 0,
      errorsByType: {},
      timeRange: { start, end },
    };
  }

  private logPerformanceWarnings(metric: ApiMetrics): void {
    // Warn about slow API calls
    if (metric.responseTime > 5000) {
      // >5s
      console.warn(`[PERF] Slow API call: ${metric.endpoint} took ${metric.responseTime}ms`);
    }

    // Warn about high error rates
    const recentStats = this.getStats(300000); // Last 5 minutes
    if (recentStats.totalRequests >= 5 && recentStats.successRate < 80) {
      console.warn(`[PERF] High error rate: ${recentStats.successRate.toFixed(1)}% success over last 5 minutes`);
    }
  }
}

// Global metrics collector instance
export const metrics = new MetricsCollector();

/**
 * Decorator function to automatically track API call performance
 */
export function trackApiCall(endpoint: string, method: string = "GET") {
  return function <T extends (...args: unknown[]) => Promise<unknown>>(
    _target: Record<string, unknown>,
    _propertyName: string,
    descriptor: TypedPropertyDescriptor<T>,
  ) {
    const originalMethod = descriptor.value!;

    descriptor.value = async function (this: unknown, ...args: unknown[]) {
      const startTime = Date.now();
      let success = false;
      let statusCode = 0;
      let errorType: string | undefined;
      let retryCount = 0;

      try {
        const result = await originalMethod.apply(this, args);
        success = true;
        statusCode = 200; // Assume success
        return result;
      } catch (error: unknown) {
        success = false;
        const errorObj = error as Record<string, unknown>;
        errorType = (errorObj.name as string) || "UnknownError";

        // Extract status code from axios errors
        if (errorObj.response && typeof errorObj.response === "object" && errorObj.response !== null) {
          const response = errorObj.response as { status?: number };
          if (typeof response.status === "number") {
            statusCode = response.status;
          }
        }

        // Count retries if available
        if (typeof errorObj.retryCount === "number") {
          retryCount = errorObj.retryCount;
        }

        throw error;
      } finally {
        const responseTime = Date.now() - startTime;

        metrics.recordApiCall({
          endpoint,
          method,
          responseTime,
          statusCode,
          success,
          errorType,
          retryCount: retryCount || undefined,
        });
      }
    } as T;

    return descriptor;
  };
}

/**
 * Performance monitoring utilities
 */
export class PerformanceMonitor {
  /**
   * Check if API performance is healthy
   */
  static isHealthy(timeRangeMs: number = 1800000): boolean {
    // Default: 30 minutes
    const stats = metrics.getStats(timeRangeMs);

    if (stats.totalRequests === 0) {
      return true; // No requests, assume healthy
    }

    // Health criteria
    const criteria = {
      minSuccessRate: 95, // 95%
      maxAvgResponseTime: 3000, // 3s
      maxP95ResponseTime: 5000, // 5s
    };

    return (
      stats.successRate >= criteria.minSuccessRate &&
      stats.averageResponseTime <= criteria.maxAvgResponseTime &&
      stats.p95ResponseTime <= criteria.maxP95ResponseTime
    );
  }

  /**
   * Get health status with details
   */
  static getHealthStatus(timeRangeMs: number = 1800000) {
    const stats = metrics.getStats(timeRangeMs);
    const isHealthy = this.isHealthy(timeRangeMs);

    return {
      healthy: isHealthy,
      stats,
      issues: this.identifyIssues(stats),
    };
  }

  private static identifyIssues(stats: PerformanceStats): string[] {
    const issues: string[] = [];

    if (stats.totalRequests === 0) {
      return issues; // No issues if no requests
    }

    if (stats.successRate < 95) {
      issues.push(`Low success rate: ${stats.successRate.toFixed(1)}%`);
    }

    if (stats.averageResponseTime > 3000) {
      issues.push(`High average response time: ${stats.averageResponseTime.toFixed(0)}ms`);
    }

    if (stats.p95ResponseTime > 5000) {
      issues.push(`High P95 response time: ${stats.p95ResponseTime.toFixed(0)}ms`);
    }

    // Check for specific error patterns
    const totalErrors = Object.values(stats.errorsByType).reduce((sum, count) => sum + count, 0);
    if (totalErrors > 0) {
      const errorRate = (totalErrors / stats.totalRequests) * 100;
      if (errorRate > 10) {
        issues.push(`High error rate: ${errorRate.toFixed(1)}%`);
      }
    }

    return issues;
  }

  /**
   * Generate performance report
   */
  static generateReport(timeRangeMs: number = 3600000): string {
    const stats = metrics.getStats(timeRangeMs);
    const health = this.getHealthStatus(timeRangeMs);

    const timeRangeHours = Math.round((timeRangeMs / 3600000) * 10) / 10;

    let report = `\n=== API Performance Report (${timeRangeHours}h) ===\n`;
    report += `Status: ${health.healthy ? "✅ Healthy" : "⚠️  Issues Detected"}\n\n`;

    if (stats.totalRequests === 0) {
      report += `No API calls in the specified time range.\n`;
      return report;
    }

    report += `📊 General Stats:\n`;
    report += `  Total Requests: ${stats.totalRequests}\n`;
    report += `  Success Rate: ${stats.successRate.toFixed(1)}%\n\n`;

    report += `⏱️ Response Times:\n`;
    report += `  Average: ${stats.averageResponseTime.toFixed(0)}ms\n`;
    report += `  P95: ${stats.p95ResponseTime.toFixed(0)}ms\n`;
    report += `  P99: ${stats.p99ResponseTime.toFixed(0)}ms\n\n`;

    if (Object.keys(stats.errorsByType).length > 0) {
      report += `❌ Errors by Type:\n`;
      Object.entries(stats.errorsByType).forEach(([type, count]) => {
        report += `  ${type}: ${count}\n`;
      });
      report += `\n`;
    }

    if (health.issues.length > 0) {
      report += `🚨 Issues Identified:\n`;
      health.issues.forEach((issue) => {
        report += `  • ${issue}\n`;
      });
      report += `\n`;
    }

    return report;
  }
}
