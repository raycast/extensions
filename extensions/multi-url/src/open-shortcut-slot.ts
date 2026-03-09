import { closeMainWindow, LocalStorage, showToast, Toast } from "@raycast/api";
import { randomUUID } from "node:crypto";

import {
  applySavedSetRunStats,
  loadHistory,
  loadSavedSets,
  loadShortcutSlots,
  MAX_HISTORY_ITEMS,
  MAX_URLS_PER_RUN,
  openInBrowser,
  parseJson,
  parseInputUrls,
  saveHistory,
  saveSavedSets,
  STORAGE_KEYS,
  ShortcutSlotKey,
} from "./shared";

const RUN_LOCK_TTL_MS = 15_000;

type RunLock = {
  acquiredAt: number;
  slot: ShortcutSlotKey;
};

async function acquireRunLock(slot: ShortcutSlotKey): Promise<boolean> {
  const now = Date.now();
  const raw = await LocalStorage.getItem<string>(STORAGE_KEYS.runLock);
  const existing = parseJson<RunLock | null>(raw, null);

  if (existing && now - existing.acquiredAt < RUN_LOCK_TTL_MS) {
    return false;
  }

  const nextLock: RunLock = {
    acquiredAt: now,
    slot,
  };
  await LocalStorage.setItem(STORAGE_KEYS.runLock, JSON.stringify(nextLock));
  return true;
}

async function releaseRunLock(): Promise<void> {
  await LocalStorage.removeItem(STORAGE_KEYS.runLock);
}

export async function runShortcutSlot(
  slot: ShortcutSlotKey,
  slotLabel: string,
): Promise<void> {
  const hasLock = await acquireRunLock(slot);
  if (!hasLock) {
    await showToast({
      style: Toast.Style.Failure,
      title: `${slotLabel}: command already running`,
      message: "Wait a few seconds and try again.",
    });
    return;
  }

  try {
    const [slots, savedSets] = await Promise.all([
      loadShortcutSlots(),
      loadSavedSets(),
    ]);

    const setId = slots[slot];
    if (!setId) {
      await showToast({
        style: Toast.Style.Failure,
        title: `${slotLabel} has no saved set`,
        message: "Open Multi-URL and map a set to this QuickURL first.",
      });
      return;
    }

    const selectedSet = savedSets.find((item) => item.id === setId);
    if (!selectedSet) {
      await showToast({
        style: Toast.Style.Failure,
        title: `${slotLabel} points to a deleted set`,
        message: "Open Multi-URL and remap this QuickURL.",
      });
      return;
    }

    const parsed = parseInputUrls(selectedSet.urls);
    if (parsed.uniqueValid.length === 0) {
      await showToast({
        style: Toast.Style.Failure,
        title: `${selectedSet.name} has no valid URLs`,
      });
      return;
    }

    if (parsed.uniqueValid.length > MAX_URLS_PER_RUN) {
      await showToast({
        style: Toast.Style.Failure,
        title: `${slotLabel}: too many URLs`,
        message: `Safety limit is ${MAX_URLS_PER_RUN} URLs per run.`,
      });
      return;
    }

    await closeMainWindow();

    const openFailures = await openInBrowser(
      parsed.uniqueValid,
      selectedSet.browserApp,
    );
    const openedCount = parsed.uniqueValid.length - openFailures.length;
    const now = new Date().toISOString();

    const nextSavedSets = savedSets.map((item) =>
      item.id === selectedSet.id
        ? applySavedSetRunStats(
            item,
            {
              openedCount,
              failedCount: openFailures.length,
              invalidCount: parsed.invalid.length,
            },
            now,
          )
        : item,
    );
    await saveSavedSets(nextSavedSets);

    const history = await loadHistory();
    const nextHistory = [
      {
        id: randomUUID(),
        urls: parsed.uniqueValid.join("\n"),
        createdAt: now,
        openedCount,
        invalidCount: parsed.invalid.length,
        failedCount: openFailures.length,
        sourceName: `${slotLabel}: ${selectedSet.name}`,
        sourceSetId: selectedSet.id,
        browserApp: selectedSet.browserApp,
      },
      ...history,
    ].slice(0, MAX_HISTORY_ITEMS);
    await saveHistory(nextHistory);

    if (openFailures.length > 0 || parsed.invalid.length > 0) {
      await showToast({
        style: Toast.Style.Failure,
        title: `${slotLabel}: opened ${openedCount}/${parsed.uniqueValid.length}`,
        message: [
          parsed.invalid.length > 0 ? `${parsed.invalid.length} invalid` : "",
          openFailures.length > 0 ? `${openFailures.length} failed` : "",
        ]
          .filter(Boolean)
          .join(" • "),
      });
      return;
    }

    await showToast({
      style: Toast.Style.Success,
      title: `${slotLabel}: opened ${openedCount} URLs`,
      message: selectedSet.name,
    });
  } finally {
    await releaseRunLock();
  }
}
