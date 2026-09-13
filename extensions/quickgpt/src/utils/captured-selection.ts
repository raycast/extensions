import { getSelectedFinderItems, getSelectedText } from "@raycast/api";
import { startupElapsedMs, startupLog, startupNowMs } from "./startup-profiler";

export type FinderItems = Awaited<ReturnType<typeof getSelectedFinderItems>>;

// Capture selection as early as possible, before heavier modules initialize and
// before the Raycast window can steal focus from the source application.
export const capturedFinderItemsPromise: Promise<FinderItems> = (() => {
  const started = startupNowMs();
  return getSelectedFinderItems()
    .then((finderItems) => {
      startupLog("Captured Finder items", {
        durationMs: startupElapsedMs(started),
        count: finderItems.length,
      });
      return finderItems;
    })
    .catch((error) => {
      startupLog("Captured Finder items failed", {
        durationMs: startupElapsedMs(started),
        error: String(error),
      });
      return [] as FinderItems;
    });
})();

export const capturedSelectedTextPromise: Promise<string> = (() => {
  const started = startupNowMs();
  return getSelectedText()
    .then((selectedText) => {
      startupLog("Captured selected text", {
        durationMs: startupElapsedMs(started),
        length: selectedText.length,
      });
      return selectedText;
    })
    .catch((error) => {
      startupLog("Captured selected text failed", {
        durationMs: startupElapsedMs(started),
        error: String(error),
      });
      return "";
    });
})();

export const capturedSelectionPromise: Promise<{
  finderItems: FinderItems;
  selectedText: string;
}> = Promise.all([capturedFinderItemsPromise, capturedSelectedTextPromise]).then(([finderItems, selectedText]) => ({
  finderItems,
  selectedText,
}));
