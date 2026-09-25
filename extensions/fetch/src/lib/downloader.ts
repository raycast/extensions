import { killDownload, startDownload } from "@chrismessina/raycast-downloader/detach";
import type { DownloadErrorCode } from "@chrismessina/raycast-downloader/errors";
import { releaseReservation } from "@chrismessina/raycast-downloader/paths";
import { watchStatus, type DownloadStatus as RunnerStatus } from "@chrismessina/raycast-downloader/status";
import { getErrorMessage } from "@chrismessina/raycast-kit";
import { logDownloadComplete, logDownloadError, logDownloadStart, logInfo } from "./logger";

/**
 * Adapter over `@chrismessina/raycast-downloader`.
 *
 * The transfer itself is DETACHED: `startDownload` spawns a runner that outlives
 * this command, streams into `<outputPath>.part`, and renames on success. That is
 * why there is no curl handling here any more — the package owns the config file,
 * `fail`, resume via HTTP Range, stall detection and failure classification.
 *
 * The `{ promise, cancel }` shape is preserved so the commands did not have to be
 * rewritten: the promise is synthesized from the status file reaching a terminal
 * state. If the Raycast window closes the promise simply never settles — the
 * download keeps running, and `notifyOnFinish` reports the outcome instead.
 */

export interface DownloadOptions {
  url: string;
  outputPath: string;
  headers?: Record<string, string>;
  followRedirects?: boolean;
  /** Seconds with NO data received before the transfer is abandoned. */
  timeout?: number;
  filename?: string;
  expectedBytes?: number;
}

export interface DownloadProgress {
  percent: number;
  bytesDownloaded: number;
  totalBytes: number;
  speed: number;
  eta: number;
}

export interface DownloadResult {
  success: boolean;
  /** The runner's ticket id. History MUST key on this: `reconcileHistory` sweeps
   *  status files by the same id, so a different id yields a duplicate record. */
  id?: string;
  url: string;
  outputPath?: string;
  error?: string;
  /** Classified failure code from the runner, kept for history records. */
  errorCode?: DownloadErrorCode;
  bytesDownloaded?: number;
  duration?: number;
}

/**
 * Should the caller release the `<outputPath>.part` it reserved?
 *
 * True only when the runner never took the reservation. `!result.id` is the test:
 * only the pre-ticket `.catch` omits an id, and every path through it either never
 * claimed the file or released it on the way out.
 *
 * NEVER on `conflict` — that means another process is alive and writing to this
 * exact `.part`, and `releaseReservation` unlinks any sidecar still at zero bytes,
 * so releasing during the live runner's TTFB deletes its file and its final rename
 * fails with ENOENT. Bytes lost, silently.
 *
 * Lives here, exported, because both commands need it and the two copies drifted:
 * the `conflict` guard was added to one and not the other, which was the bug.
 */
export function shouldReleaseReservation(result: DownloadResult): boolean {
  return !result.success && !result.id && result.errorCode !== "conflict";
}

export type ProgressCallback = (progress: DownloadProgress) => void;

export interface DownloadHandle {
  promise: Promise<DownloadResult>;
  cancel: () => void;
}

export type DownloadStatus = "pending" | "downloading" | "completed" | "failed" | "cancelled";

/** User-facing text for a cancelled transfer. Status is decided by `errorCode`, never by this string. */
const CANCELLED = "Download cancelled";

function toProgress(status: RunnerStatus): DownloadProgress {
  const total = status.totalBytes ?? 0;
  return {
    percent: total > 0 ? Math.min(100, (status.bytesDownloaded / total) * 100) : 0,
    bytesDownloaded: status.bytesDownloaded,
    totalBytes: total,
    speed: status.speedBytesPerSec ?? 0,
    eta: status.etaSeconds ?? 0,
  };
}

export function downloadFile(options: DownloadOptions, onProgress?: ProgressCallback): DownloadHandle {
  const { url, outputPath, headers, followRedirects = true, timeout, filename, expectedBytes } = options;

  let cancelled = false;
  let watcher: { stop(): void } | undefined;
  let ticketId: string | undefined;
  let ticketPid: number | undefined;
  const startedAt = Date.now();

  logDownloadStart(url, outputPath);

  const promise = new Promise<DownloadResult>((resolve) => {
    const settle = (result: DownloadResult) => {
      watcher?.stop();
      resolve(result);
    };

    startDownload({
      url,
      outputPath,
      filename,
      headers,
      followRedirects,
      // `resume` is left at its default. Since 0.1.4 the package will not resume
      // onto bytes it cannot vouch for: it claims `partPath` atomically, marks a
      // contaminated partial on the FILE rather than only in a status, and binds
      // the resume to the resource via `If-Range`. Fetch used to scan statuses by
      // output path to second-guess this — that scan was strictly weaker, since it
      // could not see a partial whose status had been pruned.
      expectedBytes,
      // A HEAD-derived size can legitimately disagree with the GET (gzip, stale
      // content-length), and Fetch's size always comes from a separate HEAD.
      sizeCheck: "advisory",
      // Wall-clock `maxTimeSeconds` is not plumbed to the runner either; stall
      // detection is the better control regardless — a large file should not die
      // at N seconds just for being large.
      stallSeconds: timeout,
      notifyOnFinish: { title: "Fetch", enabled: true },
    })
      .then((ticket) => {
        ticketId = ticket.id;
        ticketPid = ticket.pid;
        if (cancelled) {
          void killDownload({ id: ticket.id, pid: ticket.pid });
          settle({
            success: false,
            id: ticket.id,
            url,
            error: CANCELLED,
            errorCode: "cancelled",
            duration: Date.now() - startedAt,
          });
          return;
        }

        const fail = (message: string, code?: string) => {
          logDownloadError(url, message);
          settle({
            success: false,
            id: ticket.id,
            url,
            error: message,
            errorCode: (code as DownloadErrorCode | undefined) ?? "unknown",
            duration: Date.now() - startedAt,
          });
        };

        watcher = watchStatus(ticket.id, {
          onChange: (status) => onProgress?.(toProgress(status)),
          onSettled: (status) => {
            if (status.state !== "completed") {
              fail(
                status.error?.message ?? (status.state === "cancelled" ? CANCELLED : "Download failed"),
                status.error?.code ?? (status.state === "cancelled" ? "cancelled" : undefined),
              );
              return;
            }
            const result: DownloadResult = {
              success: true,
              id: ticket.id,
              url,
              outputPath: status.outputPath,
              bytesDownloaded: status.bytesDownloaded,
              duration: Date.now() - startedAt,
            };
            logDownloadComplete(url, result);
            settle(result);
          },
          onAbandoned: (status) =>
            fail(
              status.error?.message ?? "The download process stopped without reporting an outcome.",
              status.error?.code,
            ),
          onMissing: () => fail("Download status disappeared."),
        });
      })
      .catch((error) => {
        const message = getErrorMessage(error);
        logDownloadError(url, message);
        settle({
          success: false,
          url,
          error: message,
          errorCode: (error as { code?: DownloadErrorCode })?.code ?? "unknown",
          duration: Date.now() - startedAt,
        });
      });
  });

  const cancel = () => {
    cancelled = true;
    if (ticketId) void killDownload({ id: ticketId, pid: ticketPid });
  };

  return { promise, cancel };
}

// Batch orchestration stays here: the package has no batch export, and the
// concurrency cap is about how many runners we spawn at once.

export interface BatchDownloadItem {
  id: string;
  url: string;
  filename: string;
  outputPath: string;
  status: DownloadStatus;
  progress: DownloadProgress;
  error?: string;
  errorCode?: DownloadErrorCode;
  result?: DownloadResult;
}

/** Single source of truth for the counts — three call sites used to recompute these. */
export function tally(items: BatchDownloadItem[]): Omit<BatchProgress, "items"> {
  return {
    completed: items.filter((i) => i.status === "completed").length,
    failed: items.filter((i) => i.status === "failed" || i.status === "cancelled").length,
    total: items.length,
  };
}

export interface BatchProgress {
  items: BatchDownloadItem[];
  completed: number;
  failed: number;
  total: number;
}

export type BatchProgressCallback = (progress: BatchProgress) => void;

export interface BatchDownloadHandle {
  promise: Promise<BatchProgress>;
  cancel: () => void;
  cancelItem: (id: string) => void;
}

/**
 * What the UI needs from a running batch, minus the promise.
 *
 * Narrower than `BatchDownloadHandle` on purpose: a retry starts its own batch, so
 * the views have to be handed a fan-out over SEVERAL live batches rather than one
 * handle. There is no single promise to hand over in that case.
 */
export type BatchControls = Pick<BatchDownloadHandle, "cancel" | "cancelItem">;

export function downloadBatch(
  items: Array<{ id: string; url: string; filename: string; outputPath: string; options?: Partial<DownloadOptions> }>,
  maxConcurrent: number,
  onProgress?: BatchProgressCallback,
): BatchDownloadHandle {
  const batchItems: BatchDownloadItem[] = items.map((item) => ({
    id: item.id,
    url: item.url,
    filename: item.filename,
    outputPath: item.outputPath,
    status: "pending",
    progress: { percent: 0, bytesDownloaded: 0, totalBytes: 0, speed: 0, eta: 0 },
  }));

  const handles = new Map<string, DownloadHandle>();
  // Items cancelled while still queued. `startNext` consults this before spawning:
  // marking the item "cancelled" alone was cosmetic, because startNext would
  // overwrite the status and launch the download anyway.
  const cancelledIds = new Set<string>();
  let cancelled = false;
  let currentIndex = 0;

  logInfo("Batch download started", { totalItems: items.length, maxConcurrent });

  const emitProgress = () => {
    if (!onProgress) return;
    onProgress({ items: [...batchItems], ...tally(batchItems) });
  };

  const startNext = async (): Promise<void> => {
    if (cancelled || currentIndex >= batchItems.length) return;

    const index = currentIndex++;
    const item = batchItems[index];
    const original = items[index];

    if (cancelledIds.has(item.id)) {
      // Cancelled while queued: never spawn it, and release the reserved `.part`
      // so the name stays available for a later attempt.
      releaseReservation(item.outputPath);
      item.status = "cancelled";
      item.error = CANCELLED;
      emitProgress();
      if (!cancelled && currentIndex < batchItems.length) await startNext();
      return;
    }

    item.status = "downloading";
    emitProgress();

    const handle = downloadFile(
      { url: item.url, outputPath: item.outputPath, filename: item.filename, ...original.options },
      (progress) => {
        item.progress = progress;
        emitProgress();
      },
    );
    handles.set(item.id, handle);

    try {
      const result = await handle.promise;
      item.result = result;
      if (result.success) {
        item.status = "completed";
      } else if (result.errorCode === "cancelled") {
        item.status = "cancelled";
        item.error = result.error;
      } else {
        item.status = "failed";
        item.error = result.error;
        item.errorCode = result.errorCode;
        if (shouldReleaseReservation(result)) {
          releaseReservation(item.outputPath);
        }
      }
    } catch (error) {
      // Unreachable today — `downloadFile`'s promise only ever resolves. Kept as
      // a status update, with NO release: without a result there is nothing to
      // prove the reservation is ours to remove.
      item.status = "failed";
      item.error = getErrorMessage(error);
    } finally {
      handles.delete(item.id);
      emitProgress();
      if (!cancelled && currentIndex < batchItems.length) await startNext();
    }
  };

  const runBatch = async (): Promise<BatchProgress> => {
    const initial = Math.min(maxConcurrent, batchItems.length);
    await Promise.all(Array.from({ length: initial }, () => startNext()));

    const counts = tally(batchItems);
    logInfo("Batch download completed", { total: counts.total, successful: counts.completed, failed: counts.failed });
    return { items: [...batchItems], ...counts };
  };

  const promise = runBatch();

  const cancel = () => {
    cancelled = true;
    for (const handle of handles.values()) handle.cancel();
    for (const item of batchItems) {
      if (item.status === "pending") {
        releaseReservation(item.outputPath);
        item.status = "cancelled";
        item.error = CANCELLED;
      }
    }
    emitProgress();
  };

  const cancelItem = (id: string) => {
    cancelledIds.add(id);
    handles.get(id)?.cancel();
    const item = batchItems.find((i) => i.id === id);
    if (item && item.status === "pending") {
      item.status = "cancelled";
      item.error = CANCELLED;
      emitProgress();
    }
  };

  return { promise, cancel, cancelItem };
}
