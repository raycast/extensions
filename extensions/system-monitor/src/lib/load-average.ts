/**
 * Load average as pressure: 1-minute load equal to the core count means every core has a
 * runnable thread queued, so `load / cores` maps onto the same 0–100 scale the usage tags use.
 */
export function loadPressurePercent(load: number, coreCount: number): number {
  if (!Number.isFinite(load) || load < 0 || coreCount <= 0) {
    return 0;
  }

  return Math.min(100, Math.round((load / coreCount) * 100));
}
