/**
 * React hook for FIRE settings CRUD via LocalStorage.
 *
 * This hook owns the FIRE configuration lifecycle — loading, saving, and
 * clearing settings. It uses its own LocalStorage key (`fire-settings`),
 * completely independent from portfolio data.
 *
 * Design:
 * - Uses `useCachedPromise` from @raycast/utils for async loading with caching
 * - Follows the same fresh-read mutation pattern as `usePortfolio`:
 *   every save reads the latest state from storage before writing,
 *   avoiding stale closure issues from Raycast's push() navigation.
 * - The hook never reads or modifies portfolio data.
 */

import { useCallback } from "react";
import { LocalStorage, showToast, Toast } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { FireSettings, FIRE_STORAGE_KEY } from "../utils/fire-types";

// ──────────────────────────────────────────
// Storage Helpers (module-level, not exported)
// ──────────────────────────────────────────

/**
 * Loads FIRE settings from LocalStorage.
 *
 * Returns `null` when no settings have been saved yet (first launch).
 * Performs basic shape validation to guard against corrupted data.
 */
async function loadFireSettings(): Promise<FireSettings | null> {
  try {
    const raw = await LocalStorage.getItem<string>(FIRE_STORAGE_KEY);

    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw);

    if (!isValidFireSettings(parsed)) {
      console.warn("Stored FIRE settings have invalid shape, returning null");
      return null;
    }

    return parsed as FireSettings;
  } catch (error) {
    console.error("Failed to load FIRE settings from LocalStorage:", error);
    return null;
  }
}

/**
 * Persists FIRE settings to LocalStorage.
 *
 * Automatically stamps `updatedAt` before writing.
 */
async function saveFireSettings(settings: FireSettings): Promise<void> {
  const toSave: FireSettings = {
    ...settings,
    updatedAt: new Date().toISOString(),
  };

  await LocalStorage.setItem(FIRE_STORAGE_KEY, JSON.stringify(toSave));
}

/**
 * Removes FIRE settings from LocalStorage entirely.
 */
async function clearFireSettings(): Promise<void> {
  await LocalStorage.removeItem(FIRE_STORAGE_KEY);
}

// ──────────────────────────────────────────
// Validation
// ──────────────────────────────────────────

/**
 * Basic shape validation for parsed FIRE settings.
 *
 * Checks that all required fields are present and have the correct type.
 * Does NOT validate ranges (e.g. growth rate > 0) — that's the form's job.
 */
function isValidFireSettings(data: unknown): data is FireSettings {
  if (typeof data !== "object" || data === null) {
    return false;
  }

  const obj = data as Record<string, unknown>;

  return (
    typeof obj.targetValue === "number" &&
    typeof obj.withdrawalRate === "number" &&
    typeof obj.annualInflation === "number" &&
    typeof obj.annualGrowthRate === "number" &&
    typeof obj.yearOfBirth === "number" &&
    typeof obj.holidayEntitlement === "number" &&
    typeof obj.sippAccessAge === "number" &&
    (obj.targetFireAge === undefined || obj.targetFireAge === null || typeof obj.targetFireAge === "number") &&
    (obj.targetFireYear === undefined || obj.targetFireYear === null || typeof obj.targetFireYear === "number") &&
    Array.isArray(obj.excludedAccountIds) &&
    Array.isArray(obj.contributions) &&
    typeof obj.updatedAt === "string"
  );
}

// ──────────────────────────────────────────
// Return Type
// ──────────────────────────────────────────

export interface UseFireSettingsReturn {
  /** Current FIRE settings, or null if not yet configured */
  settings: FireSettings | null | undefined;

  /** Whether the initial load is in progress */
  isLoading: boolean;

  /** Force a reload from LocalStorage */
  revalidate: () => void;

  /**
   * Save new or updated FIRE settings.
   *
   * Uses `mutate` for optimistic UI updates. The actual write always
   * goes to LocalStorage, and the returned promise resolves when
   * the write is complete.
   */
  save: (settings: FireSettings) => Promise<void>;

  /**
   * Remove all FIRE settings (reset to first-launch state).
   */
  clear: () => Promise<void>;
}

// ──────────────────────────────────────────
// Hook Implementation
// ──────────────────────────────────────────

export function useFireSettings(): UseFireSettingsReturn {
  const {
    data: settings,
    isLoading,
    revalidate,
    mutate,
  } = useCachedPromise(loadFireSettings, [], {
    keepPreviousData: true,
  });

  // ── Save ──

  const save = useCallback(
    async (newSettings: FireSettings): Promise<void> => {
      await mutate(
        (async () => {
          const stamped: FireSettings = {
            ...newSettings,
            updatedAt: new Date().toISOString(),
          };
          await saveFireSettings(stamped);
          return stamped;
        })(),
        {
          optimisticUpdate() {
            return {
              ...newSettings,
              updatedAt: new Date().toISOString(),
            };
          },
        },
      );

      await showToast({
        style: Toast.Style.Success,
        title: "FIRE Settings Saved",
      });
    },
    [mutate],
  );

  // ── Clear ──

  const clear = useCallback(async (): Promise<void> => {
    await mutate(
      (async () => {
        await clearFireSettings();
        return null;
      })(),
      {
        optimisticUpdate() {
          return null;
        },
      },
    );

    await showToast({
      style: Toast.Style.Success,
      title: "FIRE Settings Reset",
      message: "All FIRE configuration has been removed.",
    });
  }, [mutate]);

  // ── Return ──

  return {
    settings: settings ?? null,
    isLoading,
    revalidate,
    save,
    clear,
  };
}
