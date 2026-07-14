/**
 * Debt repayment tracking service.
 *
 * Manages the persistent log of auto-applied monthly repayments for debt
 * positions. Each debt position tracks which repayments have been applied
 * so the system can determine when new repayments are due.
 *
 * Storage: Uses Raycast's LocalStorage under the key `debt-repayments`,
 * completely independent from portfolio data. The repayment log is a
 * simple array of entries, one per debt position, tracking the count
 * of applied repayments and the date of the last application.
 *
 * On each portfolio load, the debt calculator checks how many repayments
 * should have occurred since the debt was entered. If more are due than
 * have been logged, the new ones are applied and the log is updated.
 *
 * Design:
 * - Pure async functions over LocalStorage — no React hooks
 * - Idempotent: calling `syncRepayments` multiple times with the same
 *   date produces the same result
 * - Does not modify portfolio data — only reads debt positions and
 *   writes to its own storage key
 */

import { LocalStorage } from "@raycast/api";
import { STORAGE_KEYS } from "../utils/constants";
import { DebtData } from "../utils/types";
import { countRepaymentsDue, applyMonthlyUpdate } from "./debt-calculator";

// ──────────────────────────────────────────
// Types
// ──────────────────────────────────────────

/**
 * A single entry in the repayment log, tracking auto-applied
 * repayments for one debt position.
 */
export interface DebtRepaymentEntry {
  /** The position ID this entry belongs to */
  positionId: string;

  /** Number of repayments that have been auto-applied */
  appliedCount: number;

  /** ISO 8601 timestamp of the last time repayments were synced */
  lastSyncedAt: string;

  /**
   * The computed balance after all applied repayments.
   * Cached here to avoid re-replaying the full history on every load.
   */
  cachedBalance: number;

  /** Cumulative interest accrued across all applied repayments */
  cumulativeInterest: number;

  /** Cumulative principal repaid across all applied repayments */
  cumulativePrincipal: number;
}

/**
 * The full repayment log stored in LocalStorage.
 */
export interface DebtRepaymentLog {
  /** One entry per tracked debt position */
  entries: DebtRepaymentEntry[];

  /** ISO 8601 timestamp of the last write to this log */
  updatedAt: string;
}

// ──────────────────────────────────────────
// Read
// ──────────────────────────────────────────

/**
 * Loads the debt repayment log from LocalStorage.
 *
 * Returns an empty log if no data exists (first launch or no debt positions).
 *
 * @returns The current repayment log
 */
export async function loadRepaymentLog(): Promise<DebtRepaymentLog> {
  try {
    const raw = await LocalStorage.getItem<string>(STORAGE_KEYS.DEBT_REPAYMENTS);

    if (!raw) {
      return createEmptyLog();
    }

    const parsed = JSON.parse(raw);

    if (!isValidLog(parsed)) {
      console.warn("Debt repayment log has invalid shape, returning empty log");
      return createEmptyLog();
    }

    return parsed as DebtRepaymentLog;
  } catch (error) {
    console.error("Failed to load debt repayment log:", error);
    return createEmptyLog();
  }
}

// ──────────────────────────────────────────
// Write
// ──────────────────────────────────────────

/**
 * Saves the debt repayment log to LocalStorage.
 *
 * @param log - The repayment log to persist
 */
export async function saveRepaymentLog(log: DebtRepaymentLog): Promise<void> {
  const toSave: DebtRepaymentLog = {
    ...log,
    updatedAt: new Date().toISOString(),
  };

  await LocalStorage.setItem(STORAGE_KEYS.DEBT_REPAYMENTS, JSON.stringify(toSave));
}

// ──────────────────────────────────────────
// Sync
// ──────────────────────────────────────────

/**
 * Result of syncing repayments for a single debt position.
 */
export interface SyncResult {
  /** Position ID */
  positionId: string;

  /** Updated balance after applying any new repayments */
  currentBalance: number;

  /** Number of NEW repayments applied during this sync */
  newRepaymentsApplied: number;

  /** Total repayments applied (including previously applied) */
  totalRepaymentsApplied: number;

  /** Cumulative interest across all applied repayments */
  cumulativeInterest: number;

  /** Cumulative principal across all applied repayments */
  cumulativePrincipal: number;

  /** Whether the debt is now fully paid off */
  isPaidOff: boolean;
}

/**
 * Syncs repayments for a single debt position.
 *
 * Compares the number of repayments that should have occurred (based on
 * entry date and repayment day) against the number already logged. If
 * new repayments are due, applies them sequentially and updates the log.
 *
 * This function is idempotent — calling it multiple times on the same
 * day produces the same result.
 *
 * @param positionId - The position ID to sync
 * @param debtData   - The debt configuration for this position
 * @param now        - Override the current date (for testing)
 * @returns Sync result with updated balance and metrics
 */
export async function syncPositionRepayments(
  positionId: string,
  debtData: DebtData,
  now: Date = new Date(),
): Promise<SyncResult> {
  const log = await loadRepaymentLog();
  const existing = log.entries.find((e) => e.positionId === positionId);

  const appliedCount = existing?.appliedCount ?? 0;
  const totalDue = countRepaymentsDue(debtData.enteredAt, debtData.repaymentDayOfMonth, now);
  const newRepayments = Math.max(0, totalDue - appliedCount);

  // Start from the cached balance if we have one, otherwise from the original
  let balance = existing?.cachedBalance ?? debtData.currentBalance;
  let cumulativeInterest = existing?.cumulativeInterest ?? 0;
  let cumulativePrincipal = existing?.cumulativePrincipal ?? 0;

  // Apply new repayments
  for (let i = 0; i < newRepayments; i++) {
    const result = applyMonthlyUpdate(balance, debtData.apr, debtData.monthlyRepayment);
    balance = result.newBalance;
    cumulativeInterest += result.interestCharged;
    cumulativePrincipal += result.principalPaid;

    if (result.isPaidOff) break;
  }

  const totalApplied = appliedCount + newRepayments;
  const isPaidOff = balance <= 0.01;

  // Update the log entry
  const updatedEntry: DebtRepaymentEntry = {
    positionId,
    appliedCount: totalApplied,
    lastSyncedAt: now.toISOString(),
    cachedBalance: Math.max(0, balance),
    cumulativeInterest,
    cumulativePrincipal,
  };

  // Replace or add the entry
  const entryIndex = log.entries.findIndex((e) => e.positionId === positionId);
  if (entryIndex >= 0) {
    log.entries[entryIndex] = updatedEntry;
  } else {
    log.entries.push(updatedEntry);
  }

  // Persist only if there were changes
  if (newRepayments > 0 || !existing) {
    await saveRepaymentLog(log);
  }

  return {
    positionId,
    currentBalance: Math.max(0, balance),
    newRepaymentsApplied: newRepayments,
    totalRepaymentsApplied: totalApplied,
    cumulativeInterest,
    cumulativePrincipal,
    isPaidOff,
  };
}

/**
 * Resets the cached balance for a debt position in the repayment log.
 *
 * Called when a debt position is manually edited (e.g. the user corrects
 * the outstanding balance). The `appliedCount` is preserved so the sync
 * engine does not re-apply historical repayments — only future ones start
 * from the new balance.
 *
 * @param positionId - The position whose cached balance should be reset
 * @param newBalance - The new manually-entered balance to use as the baseline
 */
export async function resetCachedBalance(positionId: string, newBalance: number): Promise<void> {
  const log = await loadRepaymentLog();
  const entryIndex = log.entries.findIndex((e) => e.positionId === positionId);

  if (entryIndex < 0) {
    // No existing entry — nothing to reset; next sync will start from debtData.currentBalance
    return;
  }

  log.entries[entryIndex] = {
    ...log.entries[entryIndex],
    cachedBalance: Math.max(0, newBalance),
    lastSyncedAt: new Date().toISOString(),
  };

  await saveRepaymentLog(log);
}

/**
 * Syncs repayments for multiple debt positions in one pass.
 *
 * Loads the log once, applies all updates, then saves once.
 * More efficient than calling `syncPositionRepayments` individually.
 *
 * @param positions - Array of { positionId, debtData } to sync
 * @param now       - Override the current date (for testing)
 * @returns Map of positionId → SyncResult
 */
export async function syncAllRepayments(
  positions: Array<{ positionId: string; debtData: DebtData }>,
  now: Date = new Date(),
): Promise<Map<string, SyncResult>> {
  if (positions.length === 0) return new Map();

  const log = await loadRepaymentLog();
  const results = new Map<string, SyncResult>();
  let hasChanges = false;

  for (const { positionId, debtData } of positions) {
    // Skip archived or paid-off positions — they no longer accrue repayments
    if (debtData.archived || debtData.paidOff) continue;

    const existing = log.entries.find((e) => e.positionId === positionId);
    const appliedCount = existing?.appliedCount ?? 0;
    const totalDue = countRepaymentsDue(debtData.enteredAt, debtData.repaymentDayOfMonth, now);
    const newRepayments = Math.max(0, totalDue - appliedCount);

    let balance = existing?.cachedBalance ?? debtData.currentBalance;
    let cumulativeInterest = existing?.cumulativeInterest ?? 0;
    let cumulativePrincipal = existing?.cumulativePrincipal ?? 0;

    for (let i = 0; i < newRepayments; i++) {
      const result = applyMonthlyUpdate(balance, debtData.apr, debtData.monthlyRepayment);
      balance = result.newBalance;
      cumulativeInterest += result.interestCharged;
      cumulativePrincipal += result.principalPaid;
      if (result.isPaidOff) break;
    }

    const totalApplied = appliedCount + newRepayments;
    const isPaidOff = balance <= 0.01;

    const updatedEntry: DebtRepaymentEntry = {
      positionId,
      appliedCount: totalApplied,
      lastSyncedAt: now.toISOString(),
      cachedBalance: Math.max(0, balance),
      cumulativeInterest,
      cumulativePrincipal,
    };

    const entryIndex = log.entries.findIndex((e) => e.positionId === positionId);
    if (entryIndex >= 0) {
      log.entries[entryIndex] = updatedEntry;
    } else {
      log.entries.push(updatedEntry);
    }

    if (newRepayments > 0 || !existing) {
      hasChanges = true;
    }

    results.set(positionId, {
      positionId,
      currentBalance: Math.max(0, balance),
      newRepaymentsApplied: newRepayments,
      totalRepaymentsApplied: totalApplied,
      cumulativeInterest,
      cumulativePrincipal,
      isPaidOff,
    });
  }

  if (hasChanges) {
    await saveRepaymentLog(log);
  }

  return results;
}

// ──────────────────────────────────────────
// Lookup
// ──────────────────────────────────────────

/**
 * Gets the cached repayment entry for a specific position.
 *
 * Returns null if no entry exists (position hasn't been synced yet).
 * This is a read-only operation — does not trigger any syncing.
 *
 * @param positionId - The position ID to look up
 * @returns The repayment entry, or null
 */
export async function getRepaymentEntry(positionId: string): Promise<DebtRepaymentEntry | null> {
  const log = await loadRepaymentLog();
  return log.entries.find((e) => e.positionId === positionId) ?? null;
}

/**
 * Gets the applied repayment count for a position.
 * Returns 0 if no entry exists.
 *
 * @param positionId - The position ID
 * @returns Number of applied repayments
 */
export async function getAppliedRepaymentCount(positionId: string): Promise<number> {
  const entry = await getRepaymentEntry(positionId);
  return entry?.appliedCount ?? 0;
}

// ──────────────────────────────────────────
// Cleanup
// ──────────────────────────────────────────

/**
 * Removes repayment entries for positions that no longer exist in the portfolio.
 *
 * Should be called periodically (e.g. on portfolio load) to prevent
 * orphaned entries from accumulating.
 *
 * @param activePositionIds - Set of position IDs currently in the portfolio
 */
export async function pruneOrphanedEntries(activePositionIds: Set<string>): Promise<void> {
  const log = await loadRepaymentLog();
  const before = log.entries.length;

  log.entries = log.entries.filter((e) => activePositionIds.has(e.positionId));

  if (log.entries.length < before) {
    await saveRepaymentLog(log);
  }
}

/**
 * Removes the repayment entry for a specific position.
 *
 * Use when a debt position is deleted from the portfolio.
 *
 * @param positionId - The position ID to remove
 */
export async function removeRepaymentEntry(positionId: string): Promise<void> {
  const log = await loadRepaymentLog();
  const before = log.entries.length;

  log.entries = log.entries.filter((e) => e.positionId !== positionId);

  if (log.entries.length < before) {
    await saveRepaymentLog(log);
  }
}

/**
 * Clears the entire debt repayment log.
 *
 * ⚠️ Destructive — all repayment tracking data will be lost.
 */
export async function clearRepaymentLog(): Promise<void> {
  await LocalStorage.removeItem(STORAGE_KEYS.DEBT_REPAYMENTS);
}

// ──────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────

/**
 * Returns a fresh, empty repayment log.
 */
function createEmptyLog(): DebtRepaymentLog {
  return {
    entries: [],
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Basic shape validation for a parsed repayment log.
 */
function isValidLog(data: unknown): data is DebtRepaymentLog {
  if (typeof data !== "object" || data === null) return false;

  const obj = data as Record<string, unknown>;

  if (!Array.isArray(obj.entries)) return false;
  if (typeof obj.updatedAt !== "string") return false;

  // Validate each entry has required fields
  for (const entry of obj.entries) {
    if (typeof entry !== "object" || entry === null) return false;
    const e = entry as Record<string, unknown>;
    if (typeof e.positionId !== "string") return false;
    if (typeof e.appliedCount !== "number") return false;
    if (typeof e.cachedBalance !== "number") return false;
  }

  return true;
}
