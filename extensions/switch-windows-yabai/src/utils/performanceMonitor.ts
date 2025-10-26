/**
 * Performance monitoring utility to track and analyze operation timings
 * Provides measurement capabilities for optimization validation
 */

interface PerformanceMetric {
  count: number;
  avg: number;
  min: number;
  max: number;
  p95: number;
  p99: number;
  values: number[];
}

export class PerformanceMonitor {
  private metrics = new Map<string, number[]>();
  private startTimes = new Map<string, number>();

  /**
   * Start timing an operation
   */
  startTimer(operationName: string): void {
    this.startTimes.set(operationName, performance.now());
  }

  /**
   * End timing an operation and record the duration
   */
  endTimer(operationName: string): number | null {
    const startTime = this.startTimes.get(operationName);
    if (!startTime) {
      console.warn(`No start time found for operation: ${operationName}`);
      return null;
    }

    const duration = performance.now() - startTime;
    this.recordMetric(operationName, duration);
    this.startTimes.delete(operationName);

    return duration;
  }

  /**
   * Measure a synchronous function execution time
   */
  measure<T>(operationName: string, fn: () => T): T {
    const start = performance.now();
    const result = fn();
    const duration = performance.now() - start;
    this.recordMetric(operationName, duration);
    return result;
  }

  /**
   * Measure an async function execution time
   */
  async measureAsync<T>(operationName: string, fn: () => Promise<T>): Promise<T> {
    const start = performance.now();
    const result = await fn();
    const duration = performance.now() - start;
    this.recordMetric(operationName, duration);
    return result;
  }

  /**
   * Record a metric value manually
   */
  recordMetric(operationName: string, duration: number): void {
    if (!this.metrics.has(operationName)) {
      this.metrics.set(operationName, []);
    }

    const values = this.metrics.get(operationName)!;
    values.push(duration);

    // Keep only the last 100 measurements to prevent memory leaks
    if (values.length > 100) {
      values.shift();
    }
  }

  /**
   * Get performance statistics for an operation
   */
  getStats(operationName: string): PerformanceMetric | null {
    const values = this.metrics.get(operationName);
    if (!values || values.length === 0) return null;

    const sorted = [...values].sort((a, b) => a - b);
    const sum = values.reduce((acc, val) => acc + val, 0);

    return {
      count: values.length,
      avg: sum / values.length,
      min: sorted[0],
      max: sorted[sorted.length - 1],
      p95: sorted[Math.floor(sorted.length * 0.95)] || sorted[sorted.length - 1],
      p99: sorted[Math.floor(sorted.length * 0.99)] || sorted[sorted.length - 1],
      values: [...values], // Return a copy to prevent external mutation
    };
  }

  /**
   * Get all performance statistics
   */
  getAllStats(): Record<string, PerformanceMetric> {
    const stats: Record<string, PerformanceMetric> = {};
    for (const operationName of this.metrics.keys()) {
      const operationStats = this.getStats(operationName);
      if (operationStats) {
        stats[operationName] = operationStats;
      }
    }
    return stats;
  }

  /**
   * Clear all metrics
   */
  clear(): void {
    this.metrics.clear();
    this.startTimes.clear();
  }

  /**
   * Clear metrics for a specific operation
   */
  clearOperation(operationName: string): void {
    this.metrics.delete(operationName);
    this.startTimes.delete(operationName);
  }

  /**
   * Log performance summary to console
   */
  logSummary(): void {
    const stats = this.getAllStats();
    console.group("🚀 Performance Summary");

    Object.entries(stats).forEach(([operation, metric]) => {
      console.log(`📊 ${operation}:`);
      console.log(`  Avg: ${metric.avg.toFixed(2)}ms`);
      console.log(`  Min: ${metric.min.toFixed(2)}ms`);
      console.log(`  Max: ${metric.max.toFixed(2)}ms`);
      console.log(`  P95: ${metric.p95.toFixed(2)}ms`);
      console.log(`  Count: ${metric.count}`);
      console.log("");
    });

    console.groupEnd();
  }

  /**
   * Check if operation exceeds performance threshold
   */
  checkThreshold(operationName: string, thresholdMs: number): boolean {
    const stats = this.getStats(operationName);
    if (!stats) return false;

    return stats.avg > thresholdMs;
  }

  /**
   * Set up performance monitoring alerts
   */
  setupAlerts(): void {
    // Check for performance issues every 30 seconds
    setInterval(() => {
      const thresholds = {
        "app-loading": 100, // 100ms threshold for app loading
        "search-operation": 10, // 10ms threshold for search
        "yabai-query": 100, // 100ms threshold for yabai queries
        "cache-operation": 5, // 5ms threshold for cache operations
        "storage-operation": 20, // 20ms threshold for storage operations
      };

      Object.entries(thresholds).forEach(([operation, threshold]) => {
        if (this.checkThreshold(operation, threshold)) {
          const stats = this.getStats(operation);
          console.warn(
            `⚠️ Performance Alert: ${operation} averaging ${stats?.avg.toFixed(2)}ms (threshold: ${threshold}ms)`,
          );
        }
      });
    }, 30000);
  }
}

// Export singleton instance
export const performanceMonitor = new PerformanceMonitor();

// Auto-setup alerts in development
if (process.env.NODE_ENV === "development") {
  performanceMonitor.setupAlerts();
}
