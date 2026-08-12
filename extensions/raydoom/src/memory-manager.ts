/**
 * Memory Manager - Monitors and manages memory usage to prevent heap exhaustion
 */

const MEMORY_WARNING_THRESHOLD_MB = 500;
const MEMORY_CRITICAL_THRESHOLD_MB = 700;
const MEMORY_CHECK_INTERVAL_MS = 30000;
const PERIODIC_GC_INTERVAL_MS = 300000;

export interface MemoryStats {
  heapUsedMB: number;
  heapTotalMB: number;
  externalMB: number;
  rss: number;
  timestamp: number;
}

let memoryCheckInterval: NodeJS.Timeout | null = null;
let periodicGCInterval: NodeJS.Timeout | null = null;
let lastMemoryStats: MemoryStats | null = null;
let onMemoryWarning: ((stats: MemoryStats) => void) | null = null;

/**
 * Get current memory usage statistics
 */
export function getMemoryStats(): MemoryStats {
  const usage = process.memoryUsage();
  return {
    heapUsedMB: Math.round(usage.heapUsed / 1024 / 1024),
    heapTotalMB: Math.round(usage.heapTotal / 1024 / 1024),
    externalMB: Math.round(usage.external / 1024 / 1024),
    rss: Math.round(usage.rss / 1024 / 1024),
    timestamp: Date.now(),
  };
}

/**
 * Format memory stats as readable string
 */
export function formatMemoryStats(stats: MemoryStats): string {
  return `Heap: ${stats.heapUsedMB}/${stats.heapTotalMB}MB | External: ${stats.externalMB}MB | RSS: ${stats.rss}MB`;
}

/**
 * Log current memory statistics
 */
export function forceMemoryCleanup(): void {
  const stats = getMemoryStats();
  console.log(`[Memory] Cleanup triggered - ${formatMemoryStats(stats)}`);
}

/**
 * Check memory usage and trigger cleanup if needed
 */
function checkMemoryUsage(): void {
  const stats = getMemoryStats();
  lastMemoryStats = stats;

  console.log(`[Memory] ${formatMemoryStats(stats)}`);

  if (stats.heapUsedMB >= MEMORY_CRITICAL_THRESHOLD_MB) {
    console.warn(
      `[Memory] CRITICAL: Heap usage ${stats.heapUsedMB}MB exceeds ${MEMORY_CRITICAL_THRESHOLD_MB}MB threshold!`,
    );
    forceMemoryCleanup();

    if (onMemoryWarning) {
      onMemoryWarning(stats);
    }
  } else if (stats.heapUsedMB >= MEMORY_WARNING_THRESHOLD_MB) {
    console.warn(
      `[Memory] WARNING: Heap usage ${stats.heapUsedMB}MB approaching limit (threshold: ${MEMORY_WARNING_THRESHOLD_MB}MB)`,
    );

    if (onMemoryWarning) {
      onMemoryWarning(stats);
    }
  }
}

/**
 * Start memory monitoring
 */
export function startMemoryMonitoring(warningCallback?: (stats: MemoryStats) => void): void {
  if (memoryCheckInterval) {
    console.log("[Memory] Monitoring already active");
    return;
  }

  onMemoryWarning = warningCallback || null;

  console.log(
    `[Memory] Starting monitoring (check every ${MEMORY_CHECK_INTERVAL_MS / 1000}s, warning at ${MEMORY_WARNING_THRESHOLD_MB}MB)`,
  );

  checkMemoryUsage();

  memoryCheckInterval = setInterval(() => {
    checkMemoryUsage();
  }, MEMORY_CHECK_INTERVAL_MS);

  periodicGCInterval = setInterval(() => {
    console.log("[Memory] Periodic GC hint");
    forceMemoryCleanup();
  }, PERIODIC_GC_INTERVAL_MS);
}

/**
 * Stop memory monitoring
 */
export function stopMemoryMonitoring(): void {
  if (memoryCheckInterval) {
    clearInterval(memoryCheckInterval);
    memoryCheckInterval = null;
  }

  if (periodicGCInterval) {
    clearInterval(periodicGCInterval);
    periodicGCInterval = null;
  }

  onMemoryWarning = null;
  console.log("[Memory] Monitoring stopped");
}

/**
 * Get last memory stats (without triggering new check)
 */
export function getLastMemoryStats(): MemoryStats | null {
  return lastMemoryStats;
}
