import { releaseReservation } from "@chrismessina/raycast-downloader/paths";
import { countOf, getErrorMessage, showError } from "@chrismessina/raycast-kit";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Action,
  ActionPanel,
  BrowserExtension,
  Clipboard,
  Form,
  Icon,
  LaunchProps,
  showToast,
  Toast,
} from "@raycast/api";
import {
  BatchControls,
  BatchDownloadHandle,
  BatchDownloadItem,
  BatchProgress,
  downloadBatch,
  DownloadStatus,
} from "./lib/downloader";
import { addBatchToHistory } from "./lib/history";
import { logDebug, logInfo, logWarn } from "./lib/logger";
import { getPreferences } from "./lib/preferences";
import {
  expandAllRangeUrls,
  extractUrlStringsFromText,
  getRangeInfo,
  hasRangePattern,
  nextAvailablePath,
  resolveOutputPath,
} from "./lib/url-utils";
import { DownloadListView } from "./views/download-list-view";

interface FormValues {
  urls: string;
  outputDirectory: string[];
}

interface PreparedItem {
  id: string;
  url: string;
  filename: string;
  outputPath: string;
}

interface LaunchContext {
  urls?: string[];
  outputDirectory?: string;
}

/** Thrown to unwind out of filename resolution when the user cancels the preflight. */
class PreparationCancelled extends Error {
  constructor() {
    super("Preparation cancelled");
    this.name = "PreparationCancelled";
  }
}

export default function Command(props: LaunchProps<{ launchContext?: LaunchContext }>) {
  const [isDownloading, setIsDownloading] = useState(false);
  const [isPreparing, setIsPreparing] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [downloadItems, setDownloadItems] = useState<BatchDownloadItem[]>([]);
  const [urlsInput, setUrlsInput] = useState("");

  // Every live batch — the original, plus any retry started while it was still
  // running. The UI gets ONE fan-out over the whole set, because a retry that
  // began alongside other downloads used to keep its handle to itself: Cancel All
  // then stopped everything except the retry, which kept writing uncancellably.
  const liveBatchesRef = useRef(new Set<BatchDownloadHandle>());
  const [liveBatchCount, setLiveBatchCount] = useState(0);

  const trackBatch = useCallback((handle: BatchDownloadHandle) => {
    liveBatchesRef.current.add(handle);
    setLiveBatchCount(liveBatchesRef.current.size);
    return () => {
      liveBatchesRef.current.delete(handle);
      setLiveBatchCount(liveBatchesRef.current.size);
    };
  }, []);

  const batchHandle = useMemo<BatchControls | null>(
    () =>
      liveBatchCount === 0
        ? null
        : {
            cancel: () => liveBatchesRef.current.forEach((h) => h.cancel()),
            cancelItem: (id: string) => liveBatchesRef.current.forEach((h) => h.cancelItem(id)),
          },
    [liveBatchCount],
  );

  // Ref mirror of downloadItems so handleRetry can inspect current state
  // without abusing setState's updater callback for side effects.
  const downloadItemsRef = useRef<BatchDownloadItem[]>([]);
  useEffect(() => {
    downloadItemsRef.current = downloadItems;
  }, [downloadItems]);

  // Set by "Cancel All" while filenames are still resolving — the preflight has no
  // batch handle to cancel yet, and on a large batch it can run for a long time.
  const prepareCancelledRef = useRef(false);

  const preferences = getPreferences();
  const launchContext = props.launchContext;

  const prepareItems = useCallback(
    async (urls: string[], outputDirectory: string, onResolved: (done: number) => void): Promise<PreparedItem[]> => {
      // Each URL needs a HEAD request to resolve its filename. Doing this serially
      // meant a long blank screen before the first row appeared, so resolve in
      // bounded-concurrency waves and report progress as they land.
      const batchSize = Math.max(preferences.maxParallelDownloads, 1);
      const items: PreparedItem[] = new Array(urls.length);
      const startedAt = Date.now();
      let resolved = 0;

      // Paths handed out by THIS batch. Overwrite mode uses it to avoid giving
      // two URLs the same name; it is local to the pass, so nothing leaks between
      // batches and there is no global to reset.
      const taken = new Set<string>();

      try {
        for (let offset = 0; offset < urls.length; offset += batchSize) {
          if (prepareCancelledRef.current) {
            throw new PreparationCancelled();
          }

          const slice = urls.slice(offset, offset + batchSize);

          // `allSettled`, not `all`: a sibling that resolves AFTER one of its wave
          // rejects has still reserved a path on disk, and `Promise.all` would have
          // unwound before that assignment landed — leaking the reservation.
          const outcomes = await Promise.allSettled(
            slice.map(async (url, sliceIndex) => {
              const index = offset + sliceIndex;
              const { filename, outputPath } = await resolveOutputPath(
                url,
                outputDirectory,
                preferences.overwriteExisting,
                taken,
              );
              taken.add(outputPath);
              items[index] = { id: `download-${startedAt}-${index}`, url, filename, outputPath };
              resolved++;
              onResolved(resolved);
            }),
          );

          const rejected = outcomes.find((o) => o.status === "rejected");
          if (rejected) throw rejected.reason;
        }

        // Cancellation can land DURING the final wave: the wave resolves, the loop
        // condition is already false, and control would return normally with a full
        // item list — launching everything the user just cancelled.
        if (prepareCancelledRef.current) {
          throw new PreparationCancelled();
        }

        return items;
      } catch (error) {
        // ANY failure here — cancellation, an unwritable directory, a dead host —
        // strands a zero-byte `<path>.part` for every URL that DID resolve, across
        // every wave. Left behind, they push later downloads onto " (1)" names for
        // files that were never written.
        for (const item of items) if (item) releaseReservation(item.outputPath);
        throw error;
      }
    },
    [preferences.overwriteExisting, preferences.maxParallelDownloads],
  );

  // Shared function to start downloads from a list of URLs
  const startDownloads = useCallback(
    async (urls: string[], outputDirectory: string) => {
      if (urls.length === 0) {
        await showError(new Error("No valid URLs found in input."), { title: "No URLs Found" });
        return;
      }

      logInfo("Batch download initiated", { urlCount: urls.length, outputDirectory });

      prepareCancelledRef.current = false;
      setIsDownloading(true);
      setIsPreparing(true);
      // A batch that starts without going through Start Over or Retry (a second
      // launchContext delivery, a future entry point) would otherwise render with
      // "Download More Files" live from the first frame.
      setIsFinished(false);

      // Resolving filenames requires a HEAD per URL, which is slow for large
      // batches — show a counter immediately so the list is never silently blank.
      const preparingToast = await showToast({
        style: Toast.Style.Animated,
        title: "Resolving Filenames",
        message: `0 of ${urls.length}`,
      });

      let preparedItems: PreparedItem[];
      try {
        preparedItems = await prepareItems(urls, outputDirectory, (done) => {
          preparingToast.message = `${done} of ${urls.length}`;
        });
      } catch (error) {
        // Never strand the user in an empty list with no way back to the form.
        setIsPreparing(false);
        setIsDownloading(false);
        await preparingToast.hide();

        // Reservations are already released by `prepareItems` on the way out.
        if (error instanceof PreparationCancelled) {
          await showToast({ style: Toast.Style.Success, title: "Cancelled" });
        } else {
          await showError(error, { title: "Could Not Prepare Downloads" });
        }
        return;
      }

      setIsPreparing(false);
      await preparingToast.hide();

      // Initialize download items for display
      const initialItems: BatchDownloadItem[] = preparedItems.map((item) => ({
        id: item.id,
        url: item.url,
        filename: item.filename,
        outputPath: item.outputPath,
        status: "pending" as DownloadStatus,
        progress: { percent: 0, bytesDownloaded: 0, totalBytes: 0, speed: 0, eta: 0 },
      }));

      setDownloadItems(initialItems);

      // Start batch download
      const handle = downloadBatch(
        preparedItems.map((item) => ({
          id: item.id,
          url: item.url,
          filename: item.filename,
          outputPath: item.outputPath,
          options: {
            followRedirects: preferences.followRedirects,
            timeout: preferences.defaultTimeout,
          },
        })),
        preferences.maxParallelDownloads,
        (progress: BatchProgress) => {
          setDownloadItems([...progress.items]);
        },
      );

      const untrack = trackBatch(handle);

      // Wait for completion and get final results
      const finalResult = await handle.promise.finally(untrack);

      // Save completed/failed items to history
      const historyItems = finalResult.items
        .filter(
          (item): item is BatchDownloadItem & { status: "completed" | "failed" } =>
            item.status === "completed" || item.status === "failed",
        )
        .map((item) => ({
          // The runner's ticket id, so `reconcileHistory` recognises this record
          // as the same download rather than adding a duplicate.
          id: item.result?.id ?? item.id,
          url: item.url,
          filename: item.filename,
          outputPath: item.outputPath,
          status: item.status,
          bytesDownloaded: item.result?.bytesDownloaded,
          error: item.error ? { code: item.errorCode ?? "unknown", message: item.error } : undefined,
        }));

      if (historyItems.length > 0) {
        await addBatchToHistory(historyItems);
      }

      const completedCount = finalResult.items.filter((i) => i.status === "completed").length;
      // Cancelled counts as "not downloaded" here: an all-cancelled batch reporting
      // a green "0 files downloaded" would be the UI lying about what happened.
      const failedItems = finalResult.items.filter((i) => i.status === "failed" || i.status === "cancelled");
      const failedCount = failedItems.length;

      // Gated on the live-batch set, not on this batch alone: a row that failed
      // early can already be running as a retry in its own batch, and offering
      // "Download More Files" while that is live is how Start Over orphaned it.
      // Both tails and `handleStartOver` key on this same set deliberately.
      if (liveBatchesRef.current.size === 0) {
        setIsFinished(true);
      }

      if (failedCount > 0) {
        const cancelledCount = failedItems.filter((i) => i.status === "cancelled").length;
        const notCompleted =
          cancelledCount === failedCount ? `${countOf(cancelledCount, "download")} cancelled` : `${failedCount} failed`;

        // Every per-item error goes on the clipboard — the summary toast alone
        // gives the user no way to see which URLs failed or why.
        await showError(new Error(`${completedCount} succeeded, ${notCompleted}`), {
          title: "Batch Download Complete",
          copyContext: failedItems.map((i) => `${i.url}: ${i.error ?? "Unknown error"}`).join("\n"),
        });
      } else {
        await showToast({
          style: Toast.Style.Success,
          title: "Batch Download Complete",
          message: `${countOf(completedCount, "file")} downloaded`,
        });
      }
    },
    [prepareItems, preferences],
  );

  // Handle launch context (URLs passed from another command)
  useEffect(() => {
    if (launchContext?.urls && launchContext.urls.length > 0) {
      const outputDir = launchContext.outputDirectory || preferences.outputDirectory;
      logInfo("Batch download launched with context", {
        urlCount: launchContext.urls.length,
        outputDirectory: outputDir,
      });
      startDownloads(launchContext.urls, outputDir);
    }
  }, [launchContext, preferences.outputDirectory, startDownloads]);

  // Pre-fill the URLs textarea from the clipboard when opened directly.
  useEffect(() => {
    if (launchContext?.urls) return;
    let cancelled = false;
    (async () => {
      const text = (await Clipboard.readText())?.trim();
      if (!cancelled && text && extractUrlStringsFromText(text).length > 0) {
        setUrlsInput(text);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [launchContext]);

  const handleSubmit = useCallback(
    async (values: FormValues) => {
      // Extract URLs from mixed input (handles markdown links, plain URLs, and range patterns)
      const extractedUrls = extractUrlStringsFromText(values.urls);

      // Expand any range patterns (e.g., file[001-025].zip)
      const expandedUrls = expandAllRangeUrls(extractedUrls);

      // Get output directory from form or fall back to preference
      const outputDirectory = values.outputDirectory?.[0] || preferences.outputDirectory;

      await startDownloads(expandedUrls, outputDirectory);
    },
    [startDownloads, preferences.outputDirectory],
  );

  const handleImportBrowserTabs = useCallback(async () => {
    try {
      const tabs = await BrowserExtension.getTabs();
      const urls = tabs.map((t) => t.url).filter((u): u is string => typeof u === "string" && u.length > 0);
      if (urls.length === 0) {
        await showError(new Error("No open tabs found."), { title: "No Browser Tabs" });
        return;
      }
      const existing = urlsInput.trim();
      setUrlsInput(existing ? `${existing}\n${urls.join("\n")}` : urls.join("\n"));
      await showToast({
        style: Toast.Style.Success,
        title: "Imported Browser Tabs",
        message: `Added ${countOf(urls.length, "URL")}`,
      });
    } catch (error) {
      logWarn("Browser tab import failed", { error: getErrorMessage(error) });
      // Show the friendly cause, but keep the real thrown error on the clipboard.
      await showError(error, {
        title: "Browser Extension Unavailable",
        message: "Install the Raycast browser extension to use this feature.",
      });
    }
  }, [urlsInput]);

  const handleRetry = useCallback(
    async (item: BatchDownloadItem) => {
      // `conflict` means another live runner holds this exact path, so retrying the
      // same path fails identically every time — the only action the row offers
      // would never work. Take the next free name instead.
      const outputPath =
        item.errorCode === "conflict" ? nextAvailablePath(item.outputPath, item.filename) : item.outputPath;

      logDebug("Retrying failed download", { url: item.url, outputPath });

      // A retry makes the batch active again. Without this, "Download More Files"
      // stays available and would abandon the running retry mid-flight.
      setIsFinished(false);

      // Update item status to pending
      setDownloadItems((prev) =>
        prev.map((i) =>
          i.id === item.id
            ? {
                ...i,
                status: "pending" as DownloadStatus,
                outputPath,
                error: undefined,
                errorCode: undefined,
                progress: { percent: 0, bytesDownloaded: 0, totalBytes: 0, speed: 0, eta: 0 },
              }
            : i,
        ),
      );

      // Start single item download
      const handle = downloadBatch(
        [
          {
            id: item.id,
            url: item.url,
            filename: item.filename,
            outputPath,
            options: {
              followRedirects: preferences.followRedirects,
              timeout: preferences.defaultTimeout,
            },
          },
        ],
        1,
        (progress: BatchProgress) => {
          const updatedItem = progress.items[0];
          if (updatedItem) {
            setDownloadItems((prev) => prev.map((i) => (i.id === item.id ? updatedItem : i)));
          }
        },
      );

      const untrack = trackBatch(handle);
      await handle.promise.finally(untrack);

      // Same gate as the batch tail — item statuses and handle liveness are not
      // the same thing, and disagreeing about it let a retry outlive the view.
      if (liveBatchesRef.current.size === 0) {
        setIsFinished(true);
      }
    },
    [preferences],
  );

  // Live range preview: if the current input contains a range pattern and nothing else complicated,
  // show the user what URLs will be generated so they can sanity-check before submitting.
  const rangePreview = useMemo(() => {
    const trimmed = urlsInput.trim();
    if (!trimmed || !hasRangePattern(trimmed) || trimmed.includes("\n")) return null;
    const info = getRangeInfo(trimmed);
    if (!info) return null;
    const padHint = info.padding > 0 ? ` (${info.padding}-digit padding)` : "";
    const expanded = expandAllRangeUrls([trimmed], 500);
    const preview = expanded.length <= 7 ? expanded : [...expanded.slice(0, 5), "…", ...expanded.slice(-2)];
    return { count: info.count, padHint, preview };
  }, [urlsInput]);

  // Returning to the form after a batch ends — without this the view is a
  // one-way door and the command has to be closed and reopened.
  const handleStartOver = useCallback(() => {
    setIsDownloading(false);
    setIsFinished(false);
    // Cancel BEFORE clearing the rows: `handle.cancel()` ends in a synchronous
    // `emitProgress()`, which calls `setDownloadItems`, so clearing first would be
    // undone. The set is empty whenever this is reachable; the order still matters.
    for (const handle of liveBatchesRef.current) handle.cancel();
    liveBatchesRef.current.clear();
    setLiveBatchCount(0);
    setDownloadItems([]);
  }, []);

  const handleCancelPreparation = useCallback(() => {
    prepareCancelledRef.current = true;
  }, []);

  if (isDownloading) {
    return (
      <DownloadListView
        items={downloadItems}
        batchHandle={batchHandle}
        onRetry={handleRetry}
        isPreparing={isPreparing}
        isFinished={isFinished}
        onStartOver={handleStartOver}
        onCancelPreparation={handleCancelPreparation}
      />
    );
  }

  return (
    <Form
      navigationTitle="Batch Download"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Download All" icon={Icon.Download} onSubmit={handleSubmit} />
          <Action
            title="Import URLs from Browser Tabs"
            icon={Icon.Globe}
            shortcut={{ modifiers: ["cmd", "shift"], key: "b" }}
            onAction={handleImportBrowserTabs}
          />
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="urls"
        title="URLs"
        placeholder="Enter URLs, one per line, or paste text containing URLs..."
        info="Supports plain URLs, markdown links, and range patterns like file[001-025].zip"
        value={urlsInput}
        onChange={setUrlsInput}
      />
      <Form.FilePicker
        id="outputDirectory"
        title="Output Directory"
        allowMultipleSelection={false}
        canChooseDirectories={true}
        canChooseFiles={false}
        defaultValue={[preferences.outputDirectory]}
      />
      {rangePreview && (
        <Form.Description
          title="Range Preview"
          text={`${rangePreview.count} URLs will be generated${rangePreview.padHint}:\n\n${rangePreview.preview.join("\n")}`}
        />
      )}
    </Form>
  );
}
