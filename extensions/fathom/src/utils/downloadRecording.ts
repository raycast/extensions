/**
 * Downloading a Fathom recording, end to end.
 *
 * Sequence, and why it is in this order:
 *
 *   1. Toast BEFORE any network call. A silent gap while Fathom generates the
 *      file reads as "the app stalled", and the user re-fires the action.
 *   2. POST, then persist the job id immediately. Dismissing Raycast during
 *      generation must not orphan the job.
 *   3. Poll to a signed URL (~30-40s in practice).
 *   4. Hand the URL to a DETACHED transfer, so the download survives dismissal.
 *   5. Watch the status file while the window happens to be open.
 *
 * Recordings run 273-638 MB, so steps 4 and 5 are not optional niceties.
 */

import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import path from "node:path";
import {
  acquireLease,
  formatProgressLine,
  isAlive,
  isTerminal,
  killDownload,
  listStatuses,
  readStatus,
  reconcile,
  releaseLease,
  releaseReservation,
  resolveDirectory,
  runnerPath,
  startDownload,
  uniquePath,
  watchStatus,
  type DownloadStatus,
  type DownloadTicket,
} from "@chrismessina/raycast-downloader";
import { showError } from "@chrismessina/raycast-kit";
import { logger } from "@chrismessina/raycast-logger";
import { getPreferenceValues, open, showToast, Toast } from "@raycast/api";
import {
  awaitDownloadReady,
  DownloadJobError,
  extensionForMedia,
  isMediaFresh,
  type DownloadMedia,
} from "../fathom/downloads";
import type { Meeting } from "../types/Types";
import { forgetJob, getJob, rememberJob } from "./downloadJobs";
import { showContextualError } from "./errorHandling";
import { getExportDirectory } from "./export";

/**
 * Notification settings for the detached runner.
 *
 * Read at spawn time and passed by value, because the runner has no access to
 * Raycast's preferences — it is a bare Node process by design.
 */
function notificationSettings(): { title: string; enabled: boolean; raycastDeeplink: boolean } {
  const preferences = getPreferenceValues<Preferences>();
  return {
    title: "Fathom",
    enabled: preferences.notifyOnDownloadFinish !== false,
    raycastDeeplink: preferences.useRaycastNotification === true,
  };
}

/**
 * Identifies THIS command instance for the status-file lease.
 *
 * Module scope, so it is stable for the life of the instance and distinct from
 * every other one: Raycast can have two instances of the same command alive at
 * once, and the lease exists precisely to tell them apart.
 */
const OWNER_ID = randomUUID();

/** How long a claim on a transfer survives without renewal. */
const LEASE_MS = 30_000;

/**
 * Recordings this instance is currently generating.
 *
 * The status-file lease covers everything from the first byte onward, but there
 * is no status file yet while Fathom renders — so two presses inside that ~30s
 * window would each resolve media and each spawn a runner. This closes it for
 * the realistic case (two presses in one view). It is in-process only, and
 * deliberately so: nothing available here coordinates across two Raycast command
 * instances, and pretending otherwise would be worse than a named limit.
 */
const preparing = new Set<string>();

/**
 * Transfers this instance already watches.
 *
 * The lease distinguishes instances, not watchers: `acquireLease` deliberately
 * succeeds when the caller is already the owner, so a second invocation inside
 * ONE instance re-acquires its own lease and would install a second watcher.
 * Both would then fire `presentOutcome` for a single download.
 */
const watching = new Set<string>();

/**
 * Signals that the user has already been shown a terminal outcome.
 *
 * Thrown to unwind out of the adoption path without letting the caller's catch
 * block present a second toast for the same event.
 */
class AlreadyReported extends Error {}

/** Forget a job record without letting a storage failure suppress the outcome toast. */
async function forgetJobQuietly(recordingId: string): Promise<void> {
  try {
    await forgetJob(recordingId);
  } catch (error) {
    logger.warn(`[download] Could not clear job record for ${recordingId}:`, error);
  }
}

/** Build a readable filename: title, date, and the real media extension. */
export function buildRecordingFilename(meeting: Meeting, media: DownloadMedia): string {
  const date = (meeting.createdAt || meeting.startTimeISO || "").slice(0, 10);
  const title = (meeting.title || "Fathom Recording").trim();
  const stem = date ? `${title} - ${date}` : title;
  return `${stem}.${extensionForMedia(media)}`;
}

export interface DownloadRecordingOptions {
  meeting: Meeting;
  recordingId: string;
  /** Reveal in Finder when the transfer finishes while the window is open. */
  revealOnComplete?: boolean;
}

/**
 * Start (or resume) a recording download.
 *
 * Returns once the transfer has been handed to the detached runner — NOT when
 * the file is complete. The download continues after this resolves and after
 * Raycast is dismissed.
 */
export async function downloadRecording(options: DownloadRecordingOptions): Promise<DownloadTicket | undefined> {
  const { meeting, recordingId, revealOnComplete = true } = options;

  // Fire before any await: this is the whole defense against "it looks stalled".
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Preparing Download",
    message: "Asking Fathom for this recording…",
  });

  // Tracked so a failure after the name is claimed can hand it back. An
  // abandoned empty reservation would burn that filename for every later
  // download of the same meeting.
  let reservedPath: string | undefined;

  // Whether THIS call is the one holding the preparing flag. Without it the
  // duplicate-press branch below would fall through to `finally` and clear the
  // flag belonging to the call still in flight — disarming the guard on the
  // second press, which is the exact case it exists for.
  let claimedPreparing = false;

  try {
    // Adopt an existing transfer rather than starting a second one.
    //
    // The whole point of detaching is that a download survives dismissal — so
    // when the user reopens Search Meetings and presses ⌘⇧D again on the same
    // meeting, there is very likely already a runner moving 600 MB. Starting
    // another would put two curl processes on one file and double the bandwidth
    // for nothing.
    const adopted = await adoptRunningTransfer(recordingId, toast, { revealOnComplete });
    if (adopted) return adopted;

    if (preparing.has(recordingId)) {
      await toast.hide();
      await showToast({
        style: Toast.Style.Success,
        title: "Already Preparing",
        message: "Fathom is still rendering this recording.",
      });
      return undefined;
    }
    preparing.add(recordingId);
    claimedPreparing = true;

    const media = await resolveMedia(recordingId, toast, meeting);

    const directory = resolveDirectory(getExportDirectory(), { onUnsafe: "fallback" });
    const filename = buildRecordingFilename(meeting, media);
    // `reserve` claims the name atomically. The runner does not create the file
    // until it renames `.part` into place, so without reservation two downloads
    // of similarly-titled meetings started moments apart would both resolve the
    // same path and one would overwrite the other.
    //
    // startAt: 2 matches this extension's existing export numbering, so files
    // users already have keep their names.
    const outputPath = uniquePath(directory, filename, { startAt: 2, reserve: true });
    reservedPath = outputPath;

    toast.title = "Downloading in Background";
    // The package's own formatter, so this first frame matches the status-file
    // updates that replace it a moment later. A local one rounded differently
    // and made the total appear to change (608 MB → 608.4 MB).
    toast.message = formatProgressLine({ bytesDownloaded: 0, totalBytes: media.fileSizeBytes });

    logger.log("[download] Resolved media", {
      recordingId,
      mediaKind: media.kind,
      contentType: media.contentType,
      sizeBytes: media.fileSizeBytes,
      expiresAt: media.expiresAt,
      outputPath,
    });

    const ticket = await startDownload({
      url: media.url,
      outputPath,
      filename: path.basename(outputPath),
      expectedBytes: media.fileSizeBytes,
      // Identifier only — never the signed URL, which is a bearer credential.
      // `recordingId` is load-bearing: findLiveTransfer() matches on it, so this
      // is what prevents a second runner on the same recording.
      meta: { recordingId, title: meeting.title },
      // The runner outlives this command, so it is the only thing that can
      // report an outcome once the window is closed — which is the normal case
      // for a download long enough to be worth detaching.
      notifyOnFinish: notificationSettings(),
    });

    // The transfer is live from here on. Nothing below may route into the
    // catch block: telling the user it failed while 600 MB continues
    // downloading in the background is worse than any bookkeeping error.
    reservedPath = undefined;

    // The generation record exists to survive a dismissal WHILE FATHOM RENDERS.
    // Once bytes are moving, the runner's own status file is the durable record
    // and this one is dead weight — so it is dropped here rather than at
    // settlement. That also retires a race: a settle handler firing late used to
    // delete whatever job now sat under this recording's key, including a newer
    // one belonging to a different, live transfer.
    //
    // The log call belongs inside this guard too: on the outer try it was the
    // one statement past the point of no return that could still route a live
    // transfer into the catch block and tell the user it had failed.
    try {
      logger.log(`[download] Started ${ticket.id} for recording ${recordingId} → ${outputPath}`);
      await forgetJob(recordingId);
    } catch (error) {
      logger.warn(`[download] Could not clear the generation record for ${recordingId}:`, error);
    }

    // Claim it before watching, so a second instance adopting later is told the
    // transfer is owned rather than installing a competing watcher.
    //
    // The result is GATED ON, not discarded: another instance can adopt the
    // seeded status file in the window between startDownload() returning and
    // this line, in which case it is already watching and we must not. And the
    // whole thing is guarded, because it touches the status file after the
    // point of no return — an I/O failure here must not reach the outer catch
    // and announce a failure for a transfer that is running fine.
    let owned = false;
    try {
      owned = Boolean(acquireLease(ticket.id, { ownerId: OWNER_ID, leaseMs: LEASE_MS }));
    } catch (error) {
      logger.warn(`[download] Could not claim ${ticket.id}:`, error);
    }

    if (!owned) {
      logger.log(`[download] ${ticket.id} was adopted elsewhere; not watching it here.`);
      await toast.hide();
      await showToast({
        style: Toast.Style.Success,
        title: "Download Started",
        message: "It is running in the background.",
      });
      return ticket;
    }

    try {
      watchTransfer(ticket, toast, { revealOnComplete, recordingId });
    } catch (error) {
      // Losing the progress UI does not stop the detached transfer; say so
      // rather than reporting a failure that did not happen.
      logger.warn(`[download] Could not attach progress watcher:`, error);
      await toast.hide();
      await showToast({
        style: Toast.Style.Success,
        title: "Download Started",
        message: "Progress can't be shown, but the download is running in the background.",
      });
    }

    return ticket;
  } catch (error) {
    // The adoption path already presented a terminal outcome; a second toast
    // for the same event is worse than none.
    if (error instanceof AlreadyReported) return undefined;

    // Only ever removes a still-empty sidecar, so this can never delete bytes
    // a resumable download already wrote.
    if (reservedPath) releaseReservation(reservedPath);
    await reportFailure(error, toast, { recordingId, title: meeting.title });
    return undefined;
  } finally {
    // Released on EVERY exit, not just the happy one: a failed attempt that
    // left the recording marked as preparing would refuse every later retry.
    if (claimedPreparing) preparing.delete(recordingId);
  }
}

/**
 * Find a transfer already running for this recording.
 *
 * Keyed on the RUNNER'S OWN status files, not on a LocalStorage record. That is
 * the whole point: the status file is written by the process actually moving
 * the bytes, so it cannot disagree with reality. The previous design asked
 * LocalStorage "is there a ticket for this recording?", which answered wrongly
 * in three separate ways — the id was never written (the command was unloaded
 * between spawning the runner and recording it), it was pruned by a TTL that
 * could not see the live transfer, or it was overwritten by a later job under
 * the same recording key. Each wrong answer put a second runner on the same
 * 600 MB file.
 *
 * `meta.recordingId` is set at spawn time by the caller below.
 */
function findLiveTransfer(recordingId: string): DownloadStatus | undefined {
  const matches = listStatuses().filter(
    (status) => !isTerminal(status.state) && status.meta?.recordingId === recordingId,
  );
  // A live match wins over a dead one. Directory order is not significance
  // order: taking the first non-terminal entry could report a dead transfer's
  // failure and leave the one actually moving bytes with no watcher at all.
  return matches.find((status) => isAlive(status)) ?? matches[0];
}

/**
 * Re-attach to a transfer this recording already has in flight.
 *
 * Returns the existing ticket when one is live, so the caller can bail out
 * instead of starting a competing download. Returns undefined when there is
 * nothing to adopt, in which case the caller starts one.
 */
async function adoptRunningTransfer(
  recordingId: string,
  toast: Toast,
  options: { revealOnComplete: boolean },
): Promise<DownloadTicket | undefined> {
  const status = findLiveTransfer(recordingId);
  if (!status) return undefined;

  if (!isAlive(status)) {
    // The runner died without recording an outcome. Report it and STOP: the
    // partial is retained, so pressing the action again resumes rather than
    // restarting. Falling through to start one automatically showed the user a
    // failure toast and then, minutes later, a second terminal toast for a
    // transfer they never asked for.
    const settled = reconcile(status);
    await forgetJobQuietly(recordingId);
    await presentOutcome(settled, toast, options.revealOnComplete);
    throw new AlreadyReported();
  }

  // Compare-and-swap on the status file. A live transfer being watched by
  // ANOTHER command instance must not be watched by this one too: both would
  // renew, both would settle, and the user would get two terminal toasts for
  // one download.
  const owned = acquireLease(status.id, { ownerId: OWNER_ID, leaseMs: LEASE_MS });
  if (!owned) {
    logger.log(`[download] Transfer ${status.id} is owned by another instance; not adopting.`);
    await toast.hide();
    await showToast({
      style: Toast.Style.Success,
      title: "Already Downloading",
      message: "This recording is already downloading.",
    });
    throw new AlreadyReported();
  }

  logger.log(`[download] Adopting in-flight transfer ${status.id} for recording ${recordingId}`);
  const ticket: DownloadTicket = {
    id: status.id,
    pid: status.pid,
    statusPath: `${status.id}.json`,
  };

  toast.title = "Downloading in Background";
  toast.message = formatProgressLine({
    bytesDownloaded: status.bytesDownloaded,
    totalBytes: status.totalBytes,
    speedBytesPerSec: status.speedBytesPerSec,
    etaSeconds: status.etaSeconds,
  });

  watchTransfer(ticket, toast, { revealOnComplete: options.revealOnComplete, recordingId });
  return ticket;
}

/**
 * Get a fresh signed URL, resuming an in-flight job when one exists.
 *
 * The resume path is what makes dismissal-during-generation survivable.
 */
async function resolveMedia(recordingId: string, toast: Toast, meeting: Meeting): Promise<DownloadMedia> {
  const existing = await getJob(recordingId);
  const expectation = generationExpectation(meeting);

  if (existing) {
    logger.log(`[download] Resuming job ${existing.downloadId} for recording ${recordingId}`);
    // Say that this is a REJOIN, not a fresh start. Otherwise reopening the
    // window after a dismissal looks identical to having achieved nothing, and
    // the elapsed counter appearing to restart reinforces that reading.
    toast.message = "Rejoining a request already in progress…";
    try {
      const media = await awaitDownloadReady(recordingId, {
        existingDownloadId: existing.downloadId,
        onProgress: (_job, elapsed) => updateGenerationToast(toast, elapsed, expectation),
      });
      if (isMediaFresh(media)) return media;
      // Expired mid-wait: fall through and request a new job.
      logger.log(`[download] Resumed job produced a stale URL; re-requesting.`);
      await forgetJob(recordingId);
    } catch (error) {
      // Only discard the remembered job when the job ITSELF is unusable. A
      // transient network blip or rate limit says nothing about the job's
      // validity, and throwing the record away would lose the durable resume
      // path — the entire reason it is persisted.
      if (isJobUnusable(error)) {
        logger.warn(`[download] Job ${existing.downloadId} is unusable; requesting a new one:`, error);
        await forgetJob(recordingId);
      } else {
        logger.warn(`[download] Transient error polling job ${existing.downloadId}; keeping it:`, error);
        throw error;
      }
    }
  }

  return awaitDownloadReady(recordingId, {
    // Awaited inside awaitDownloadReady before it ever sleeps, so the id is on
    // disk before the window in which the user is most likely to dismiss.
    onJobCreated: (job) => rememberJob({ recordingId, downloadId: job.downloadId, requestedAt: Date.now() }),
    onProgress: (_job, elapsed) => updateGenerationToast(toast, elapsed, expectation),
  });
}

/**
 * True when a remembered job can never succeed and should be replaced.
 *
 * Deliberately narrow: anything unrecognized is treated as transient and the
 * job is kept, because discarding a valid job costs the user a fresh
 * generation cycle on a 600 MB file.
 */
function isJobUnusable(error: unknown): boolean {
  if (error instanceof DownloadJobError) {
    // A "failed" with no job attached came from the response parser, not from
    // Fathom declaring the job dead — a malformed poll response is transient
    // and must not cost the user a fresh generation cycle.
    if (error.kind === "failed" && !error.job) return false;
    return error.kind === "expired" || error.kind === "failed" || error.kind === "no_media";
  }
  const message = error instanceof Error ? error.message.toUpperCase() : "";
  // The job id itself is gone or was never valid.
  return message.includes("NOT_FOUND");
}

/**
 * Keep the toast informative during generation, where no byte progress exists.
 *
 * Fathom's poll response while `status: "processing"` carries `download_id`,
 * `recording_id` and `status` — nothing else. There is no percentage, no ETA
 * and no stage to relay, so anything resembling a progress bar here would be
 * invented.
 *
 * What this must NOT say is that closing the window is safe. It is not, during
 * this phase: the poll loop lives in the command's own event loop and dies with
 * it. The `download_id` is persisted, and Fathom keeps rendering server-side
 * either way, so nothing is lost — but nothing finishes either, and the file
 * only starts transferring once someone re-fires the action and the rejoin path
 * picks up the completed job. "Safe to close" belongs on the DOWNLOADING toast,
 * where a detached process really is doing the work.
 *
 * And it says "Raycast", not "this window": a toast renders as a floating HUD
 * with no window attached to it, so "keep this window open" points at nothing
 * the user can see.
 */
function updateGenerationToast(toast: Toast, elapsedMs: number, expectation?: string): void {
  const seconds = Math.floor(elapsedMs / 1000);
  toast.title = "Preparing Download";

  // The elapsed counter is the only honest motion available, and the
  // instruction is most useful before the user has decided to press Escape —
  // so both run from the first frame rather than fading in.
  toast.message = `Rendering video${expectation ?? ""} · ${seconds}s · keep Raycast open`;
}

/**
 * A plain-language expectation for how long generation will take.
 *
 * Derived from the recording's own length, which is the only predictor we have
 * and the one the user can sanity-check. Measured: 30-46 minute recordings
 * generated in ~30-40s. A concrete second-range beats "a minute or two" —
 * it tells the user when to start worrying, which vague prose cannot.
 *
 * Returns the parenthetical only, so the caller owns the one copy of the noun.
 */
function generationExpectation(meeting: Meeting): string | undefined {
  const minutes = (meeting.durationSeconds ?? 0) / 60;
  if (!Number.isFinite(minutes) || minutes <= 0) return undefined;

  if (minutes <= 30) return " (usually 30-60s)";
  if (minutes <= 90) return " (usually 60-90s)";
  return " (usually 2-3 min)";
}

interface WatchOptions {
  revealOnComplete: boolean;
  recordingId: string;
}

/**
 * Mirror the status file into the toast while the window is open.
 *
 * Purely cosmetic: the transfer is already detached, so nothing here affects
 * whether it completes.
 */
function watchTransfer(ticket: DownloadTicket, toast: Toast, options: WatchOptions): void {
  const { revealOnComplete, recordingId } = options;

  // One watcher per transfer, per instance. The lease cannot enforce this on its
  // own — it tells instances apart, and both callers here share this instance's
  // OWNER_ID, so a re-trigger re-acquires its own lease and looks legitimate.
  if (watching.has(ticket.id)) {
    logger.log(`[download] Already watching ${ticket.id}; not installing a second watcher.`);
    return;
  }
  watching.add(ticket.id);

  watchStatus(ticket.id, {
    onChange: (status) => {
      if (isTerminal(status.state)) return;
      // Renew. The lease is deliberately short (30s) so a crashed owner frees
      // the transfer quickly; a download running for an hour therefore has to
      // keep saying it is still here.
      acquireLease(status.id, { ownerId: OWNER_ID, leaseMs: LEASE_MS });
      toast.title = status.state === "finalizing" ? "Finishing Up" : "Downloading in Background";
      toast.message = formatProgressLine({
        bytesDownloaded: status.bytesDownloaded,
        totalBytes: status.totalBytes,
        speedBytesPerSec: status.speedBytesPerSec,
        etaSeconds: status.etaSeconds,
      });
    },
    onSettled: async (status) => {
      const settled = reconcile(status);
      logger.log("[download] Settled", {
        recordingId,
        ticketId: ticket.id,
        state: settled.state,
        bytes: settled.bytesDownloaded,
        totalBytes: settled.totalBytes,
        errorCode: settled.error?.code,
        errorMessage: settled.error?.message,
      });
      watching.delete(ticket.id);
      releaseLease(ticket.id, OWNER_ID);
      await presentOutcome(settled, toast, revealOnComplete);
    },
    // The runner died without recording an outcome (SIGKILL, power loss).
    // Without this the toast would sit on "Downloading" forever.
    onAbandoned: async (status) => {
      const settled = reconcile(status);
      logger.warn("[download] Runner vanished without recording an outcome", {
        recordingId,
        ticketId: ticket.id,
        lastState: status.state,
        bytes: status.bytesDownloaded,
        lastHeartbeatAgoMs: Date.now() - status.heartbeatAt,
      });
      watching.delete(ticket.id);
      releaseLease(ticket.id, OWNER_ID);
      await presentOutcome(settled, toast, revealOnComplete);
    },
  });

  // Cancelling stops the whole process group, not just the runner.
  toast.primaryAction = {
    title: "Cancel Download",
    shortcut: { macOS: { modifiers: ["cmd"], key: "." }, Windows: { modifiers: ["ctrl"], key: "." } },
    onAction: async () => {
      const signalled = await killDownload(ticket);
      if (signalled) {
        // The runner writes `cancelled` and the watcher presents it. No toast
        // here, or the user sees two.
        return;
      }

      // `false` covers two genuinely different situations, and saying the wrong
      // one is worse than saying nothing:
      //
      //   - the transfer already reached a terminal state, or
      //   - this system could not confirm which process owns it, so nothing was
      //     force-stopped and it MAY STILL BE RUNNING.
      //
      // Read the status back rather than guessing.
      const current = readStatus(ticket.id);
      const finished = !current || isTerminal(current.state);

      if (finished) {
        await showToast({
          style: Toast.Style.Success,
          title: "Nothing to Cancel",
          message: "This download already finished.",
        });
        return;
      }

      await showError(new Error("The download could not be stopped and may still be running in the background."), {
        title: "Could Not Stop Download",
        copyContext: `Ticket: ${ticket.id} · PID: ${ticket.pid}`,
      });
    },
  };
}

/**
 * Replace the progress toast with a terminal one.
 *
 * A fresh toast rather than mutating `style` in place: mutating an already-
 * presented toast updates the title but does NOT swap the animated icon, so the
 * spinner keeps spinning beside the word "Downloaded".
 */
async function presentOutcome(status: DownloadStatus, progressToast: Toast, revealOnComplete: boolean): Promise<void> {
  await progressToast.hide();

  if (status.state === "completed") {
    if (!existsSync(status.outputPath)) {
      // The runner reported success but the file is gone — moved, or deleted
      // between the rename and this check. That is a real error, so it gets the
      // Copy Error action every failure toast owes the user.
      await showError(new Error("The file could not be found after downloading."), {
        title: "Download Missing",
        copyContext: `Expected: ${status.outputPath} · Bytes: ${status.bytesDownloaded}`,
      });
      return;
    }

    await showToast({
      style: Toast.Style.Success,
      title: "Download Complete",
      message: path.basename(status.outputPath),
      primaryAction: revealOnComplete
        ? { title: "Show in Finder", onAction: () => void open(path.dirname(status.outputPath)) }
        : undefined,
    });
    return;
  }

  if (status.state === "cancelled") {
    // Deliberately no Copy Error action: the user asked for this, and there is
    // no error to hand them.
    await showToast({ style: Toast.Style.Failure, title: "Download Cancelled" });
    return;
  }

  // Two failures wear the same face and need opposite responses, so name which
  // one happened. `runner_failed` means the helper process never transferred a
  // byte — retrying reproduces it, and the useful next step is the diagnostic
  // in the copied context, not another attempt.
  const isStartupFailure = status.error?.code === "runner_failed";
  const contextParts = [
    `File: ${path.basename(status.outputPath)}`,
    `Code: ${status.error?.code ?? "unknown"}`,
    `Output: ${status.outputPath}`,
  ];
  if (isStartupFailure) {
    // The runner is a separate process, so its startup failure leaves nothing
    // in the extension's own logs. Point at where the evidence actually is.
    contextParts.push(`Runner: ${runnerPath()}`, `Status: ${status.id}.json`);
  }

  await showError(new Error(status.error?.message ?? "The download did not complete."), {
    title: isStartupFailure ? "Download Could Not Start" : "Download Failed",
    copyContext: contextParts.join(" · "),
  });
}

/**
 * Log everything known about a download failure.
 *
 * Note the key names: the logger treats a field called `code` as potentially
 * sensitive. Under 1.5.0 a symbolic value survives (`"runner_failed"` logs
 * intact) but a NUMERIC one is zeroed — `code: 404` becomes `0`, which reads as
 * a real value rather than a redaction. `errorCode` sidesteps that entirely.
 * (An earlier version of this comment said any `code` became `******`; that was
 * true of an older logger and is no longer what happens.)
 */
function logDownloadFailure(error: unknown, context: Record<string, unknown>): void {
  const detail: Record<string, unknown> = { ...context };

  if (error instanceof DownloadJobError) {
    detail.errorType = "DownloadJobError";
    detail.jobState = error.kind;
    detail.message = error.message;
    if (error.job) {
      detail.downloadId = error.job.downloadId;
      detail.jobStatus = error.job.status;
      detail.failureReason = error.job.failureReason;
      detail.hasMedia = Boolean(error.job.media);
      detail.mediaKind = error.job.media?.kind;
    }
  } else if (error instanceof Error) {
    detail.errorType = error.name;
    detail.message = error.message;
    // `DownloadError` from the package carries these; a plain Error won't.
    const asDownload = error as Error & { code?: string; httpStatus?: number; retryable?: boolean };
    if (asDownload.code) detail.errorCode = asDownload.code;
    if (asDownload.httpStatus) detail.httpStatus = asDownload.httpStatus;
    if (typeof asDownload.retryable === "boolean") detail.retryable = asDownload.retryable;
    detail.stack = error.stack?.split("\n").slice(0, 4).join(" | ");
  } else {
    detail.errorType = typeof error;
    detail.message = String(error);
  }

  logger.error("[download] FAILED", detail);
}

async function reportFailure(error: unknown, toast: Toast, context: Record<string, unknown> = {}): Promise<void> {
  await toast.hide();
  logDownloadFailure(error, context);

  if (error instanceof DownloadJobError) {
    if (error.kind === "cancelled") return;
    await showError(error, {
      title: error.kind === "no_media" ? "Nothing to Download" : "Could Not Prepare Download",
      message: error.message,
      copyContext: `Job state: ${error.kind}${error.job ? ` · download_id: ${error.job.downloadId}` : ""}`,
    });
    return;
  }

  // A package DownloadError carries a code worth surfacing — the generic
  // classifier would flatten it to "resource could not be found".
  const asDownload = error as Error & { code?: string; retryable?: boolean };
  if (error instanceof Error && asDownload.code) {
    await showError(error, {
      title: "Download Failed",
      copyContext: `errorCode: ${asDownload.code}${
        typeof asDownload.retryable === "boolean" ? ` · retryable: ${asDownload.retryable}` : ""
      }${context.recordingId ? ` · recording: ${context.recordingId}` : ""}`,
    });
    return;
  }

  await showContextualError(error, { action: "download recording", fallbackTitle: "Download Failed" });
}
