import { closeMainWindow, showToast, Toast } from "@raycast/api";
import { randomUUID } from "node:crypto";
import { open as openFile, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

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
  ShortcutSlotKey,
} from "./shared";

const RUN_LOCK_TTL_MS = 15_000;
const RUN_LOCK_PATH = join(tmpdir(), "multi-url.quickurl.lock.json");

type RunLock = {
  acquiredAt: number;
  token: string;
};

function isErrnoError(error: unknown): error is NodeJS.ErrnoException {
  return typeof error === "object" && error !== null && "code" in error;
}

async function readRunLock(): Promise<RunLock | null> {
  try {
    return parseJson<RunLock | null>(await readFile(RUN_LOCK_PATH, "utf8"), null);
  } catch (error) {
    if (isErrnoError(error) && error.code === "ENOENT") {
      return null;
    }

    throw error;
  }
}

async function removeRunLockFile(): Promise<void> {
  try {
    await rm(RUN_LOCK_PATH);
  } catch (error) {
    if (isErrnoError(error) && error.code === "ENOENT") {
      return;
    }

    throw error;
  }
}

async function writeRunLock(lock: RunLock): Promise<boolean> {
  let handle: Awaited<ReturnType<typeof openFile>> | undefined;

  try {
    handle = await openFile(RUN_LOCK_PATH, "wx");
    await handle.writeFile(JSON.stringify(lock), "utf8");
    return true;
  } catch (error) {
    if (handle) {
      await removeRunLockFile();
    }

    if (isErrnoError(error) && error.code === "EEXIST") {
      return false;
    }

    throw error;
  } finally {
    await handle?.close().catch(() => undefined);
  }
}

async function acquireRunLock(): Promise<RunLock | null> {
  const nextLock: RunLock = {
    acquiredAt: Date.now(),
    token: randomUUID(),
  };

  for (let attempts = 0; attempts < 3; attempts += 1) {
    nextLock.acquiredAt = Date.now();

    if (await writeRunLock(nextLock)) {
      return nextLock;
    }

    const existing = await readRunLock();
    if (existing && Date.now() - existing.acquiredAt < RUN_LOCK_TTL_MS) {
      return null;
    }

    await removeRunLockFile();
  }

  return null;
}

async function releaseRunLock(lock: RunLock | null): Promise<void> {
  if (!lock) {
    return;
  }

  const existing = await readRunLock();
  if (existing?.token !== lock.token) {
    return;
  }

  await removeRunLockFile();
}

export async function runShortcutSlot(slot: ShortcutSlotKey, slotLabel: string): Promise<void> {
  const runLock = await acquireRunLock();
  if (!runLock) {
    await showToast({
      style: Toast.Style.Failure,
      title: `${slotLabel}: command already running`,
      message: "Wait a few seconds and try again.",
    });
    return;
  }

  try {
    const [slots, savedSets] = await Promise.all([loadShortcutSlots(), loadSavedSets()]);

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

    const openFailures = await openInBrowser(parsed.uniqueValid, selectedSet.browserApp);
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
    await releaseRunLock(runLock);
  }
}
