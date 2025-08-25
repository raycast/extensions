import { useEffect, useRef, useCallback } from "react";

interface PerformanceMetrics {
  renderCount: number;
  lastRenderTime: number;
  averageRenderTime: number;
  totalRenderTime: number;
}

/**
 * Hook for monitoring component performance
 * Tracks render counts, timing, and provides optimization insights
 */
export function usePerformanceMonitor(componentName: string) {
  const metricsRef = useRef<PerformanceMetrics>({
    renderCount: 0,
    lastRenderTime: 0,
    averageRenderTime: 0,
    totalRenderTime: 0,
  });

  const startTimeRef = useRef<number>(0);

  // Start timing when component begins rendering
  useEffect(() => {
    startTimeRef.current = performance.now();
  });

  // End timing and update metrics after render
  useEffect(() => {
    const endTime = performance.now();
    const renderTime = endTime - startTimeRef.current;

    const metrics = metricsRef.current;
    metrics.renderCount++;
    metrics.lastRenderTime = renderTime;
    metrics.totalRenderTime += renderTime;
    metrics.averageRenderTime = metrics.totalRenderTime / metrics.renderCount;

    // Log performance data in development
    if (process.env.NODE_ENV === "development") {
      console.log(`[${componentName}] Render #${metrics.renderCount}:`, {
        renderTime: `${renderTime.toFixed(2)}ms`,
        average: `${metrics.averageRenderTime.toFixed(2)}ms`,
        total: `${metrics.totalRenderTime.toFixed(2)}ms`,
      });
    }
  });

  // Get current metrics
  const getMetrics = useCallback(() => metricsRef.current, []);

  // Reset metrics
  const resetMetrics = useCallback(() => {
    metricsRef.current = {
      renderCount: 0,
      lastRenderTime: 0,
      averageRenderTime: 0,
      totalRenderTime: 0,
    };
  }, []);

  // Check if performance is degrading
  const isPerformanceDegrading = useCallback(() => {
    const metrics = metricsRef.current;
    if (metrics.renderCount < 5) return false; // Need more data

    const recentAverage = metrics.averageRenderTime;
    const threshold = 16.67; // 60fps threshold (1000ms / 60fps)

    return recentAverage > threshold;
  }, []);

  return {
    getMetrics,
    resetMetrics,
    isPerformanceDegrading,
  };
}
