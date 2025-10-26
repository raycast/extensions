/**
 * React performance optimization utilities
 * Provides memoization helpers and performance-optimized hooks
 */

import { useCallback, useRef, useMemo } from "react";

/**
 * Create a stable callback that doesn't change on every render
 * Useful for preventing unnecessary re-renders in child components
 */
export function useStableCallback<T extends (...args: unknown[]) => unknown>(callback: T): T {
  const callbackRef = useRef<T>();
  const stableCallback = useRef<T>();

  callbackRef.current = callback;

  if (!stableCallback.current) {
    stableCallback.current = ((...args: unknown[]) => {
      return callbackRef.current?.(...args);
    }) as T;
  }

  return stableCallback.current;
}

/**
 * Memoized equality check for arrays
 * More efficient than JSON.stringify for shallow comparisons
 */
export function arrayEquals<T>(a: T[], b: T[]): boolean {
  if (a.length !== b.length) return false;

  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }

  return true;
}

/**
 * Shallow comparison for objects
 */
export function shallowEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;

  if (!a || !b || typeof a !== "object" || typeof b !== "object") {
    return false;
  }

  const keysA = Object.keys(a);
  const keysB = Object.keys(b);

  if (keysA.length !== keysB.length) return false;

  for (const key of keysA) {
    if (!keysB.includes(key) || a[key] !== b[key]) {
      return false;
    }
  }

  return true;
}

/**
 * Hook for memoizing expensive computations with custom equality
 */
export function useMemoWithComparison<T>(
  factory: () => T,
  deps: React.DependencyList,
  isEqual: (a: React.DependencyList, b: React.DependencyList) => boolean = arrayEquals,
): T {
  const depsRef = useRef<React.DependencyList>();
  const valueRef = useRef<T>();

  if (!depsRef.current || !isEqual(deps, depsRef.current)) {
    valueRef.current = factory();
    depsRef.current = deps;
  }

  return valueRef.current as T;
}

/**
 * Optimized version of useState that batches updates
 * Useful for reducing re-renders when multiple state updates happen quickly
 */
export function useBatchedState<T>(
  initialValue: T,
  batchDelayMs: number = 16, // One frame at 60fps
): [T, (value: T | ((prev: T) => T)) => void] {
  const [state, setState] = useState<T>(initialValue);
  const pendingUpdateRef = useRef<T | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const setBatchedState = useCallback(
    (value: T | ((prev: T) => T)) => {
      const newValue =
        typeof value === "function" ? (value as (prev: T) => T)(pendingUpdateRef.current ?? state) : value;

      pendingUpdateRef.current = newValue;

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        if (pendingUpdateRef.current !== null) {
          setState(pendingUpdateRef.current);
          pendingUpdateRef.current = null;
        }
        timeoutRef.current = null;
      }, batchDelayMs);
    },
    [state, batchDelayMs],
  );

  return [state, setBatchedState];
}

/**
 * Virtualization helper for large lists
 * Returns visible items and scroll handlers
 */
export function useVirtualization<T>({
  items,
  itemHeight,
  containerHeight,
  overscan = 5,
}: {
  items: T[];
  itemHeight: number;
  containerHeight: number;
  overscan?: number;
}) {
  const [scrollTop, setScrollTop] = useState(0);

  const visibleItems = useMemo(() => {
    const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const endIndex = Math.min(items.length - 1, Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan);

    return {
      startIndex,
      endIndex,
      items: items.slice(startIndex, endIndex + 1),
      totalHeight: items.length * itemHeight,
      offsetY: startIndex * itemHeight,
    };
  }, [items, itemHeight, containerHeight, scrollTop, overscan]);

  const handleScroll = useCallback((event: React.UIEvent<HTMLElement>) => {
    setScrollTop(event.currentTarget.scrollTop);
  }, []);

  return {
    ...visibleItems,
    handleScroll,
  };
}

/**
 * Debounced callback hook that's stable and cancellable
 */
export function useDebouncedCallback<T extends (...args: unknown[]) => unknown>(
  callback: T,
  delay: number,
): [T, () => void] {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const callbackRef = useRef(callback);

  // Keep callback reference current
  callbackRef.current = callback;

  const debouncedCallback = useStableCallback(((...args: unknown[]) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      callbackRef.current(...args);
    }, delay);
  }) as T);

  const cancel = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return cancel;
  }, [cancel]);

  return [debouncedCallback, cancel];
}

/**
 * Performance monitoring hook for React components
 * Measures render times and re-render frequency
 */
export function useRenderPerformance(componentName: string, deps?: React.DependencyList) {
  const renderCountRef = useRef(0);
  const lastRenderTime = useRef(performance.now());

  useEffect(() => {
    renderCountRef.current += 1;
    const now = performance.now();
    const renderTime = now - lastRenderTime.current;

    // Log performance in development
    if (process.env.NODE_ENV === "development") {
      console.log(`${componentName} render #${renderCountRef.current} took ${renderTime.toFixed(2)}ms`);

      // Warn about expensive renders
      if (renderTime > 16) {
        console.warn(`Slow render detected in ${componentName}: ${renderTime.toFixed(2)}ms`);
      }

      // Warn about frequent re-renders
      if (renderCountRef.current > 10 && renderTime < 100) {
        console.warn(`Frequent re-renders detected in ${componentName}: ${renderCountRef.current} renders`);
      }
    }

    lastRenderTime.current = now;
  });

  // Track dependency changes
  const depsRef = useRef<React.DependencyList>();

  useEffect(() => {
    if (depsRef.current && deps && process.env.NODE_ENV === "development") {
      const changedDeps = deps
        .map((dep, i) => [dep, depsRef.current?.[i], i] as const)
        .filter(([curr, prev]) => curr !== prev);

      if (changedDeps.length > 0) {
        console.log(`${componentName} deps changed:`, changedDeps);
      }
    }
    depsRef.current = deps;
  });

  return {
    renderCount: renderCountRef.current,
  };
}

// Re-export React hooks for convenience
import { useState, useEffect } from "react";
export { useState, useEffect };
