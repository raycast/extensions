/**
 * Fathom recording downloads.
 *
 * Two endpoints:
 *   POST /recordings/{id}/download                     → 202, a job
 *   GET  /recordings/{id}/downloads/{download_id}       → poll until terminal
 *
 * Behavior verified against the live API on 2026-07-31 (7 recordings), which
 * differs from the published docs in ways that matter here:
 *
 *  - `video` and `audio` are ABSENT, not `null`, until the job completes — and
 *    only the medium the recording actually has is ever present. Parse them as
 *    optional and take whichever one exists.
 *  - Each POST mints a NEW download_id. It is not idempotent. But once the media
 *    exists server-side a repeat POST returns `completed` immediately with a
 *    freshly-signed URL, which makes expired-link recovery cheap: re-POST and
 *    resume onto the same partial file.
 *  - Signed URLs live ~24h and point at a CDN that honors HTTP Range (verified
 *    206 + accept-ranges), so interrupted transfers resume.
 *  - Generation took ~30-40s for 30-46 minute recordings; files ran 273-638 MB.
 */

import { logger, redactString } from "@chrismessina/raycast-logger";
import { isNumber, isObject, toStringOrUndefined } from "../utils/typeGuards";
import { authGetJson, authPost } from "./api";

/** Which medium a recording produced. The API returns one, not both. */
export type MediaKind = "video" | "audio";

export interface DownloadMedia {
  kind: MediaKind;
  url: string;
  contentType: string;
  fileSizeBytes?: number;
  /** Signed-URL expiry, ISO 8601. */
  expiresAt?: string;
}

export type DownloadJobStatus = "processing" | "completed" | "failed" | "expired";

export interface DownloadJob {
  downloadId: string;
  recordingId: string;
  status: DownloadJobStatus;
  /** Present only once `status === "completed"`. */
  media?: DownloadMedia;
  failureReason?: string;
}

/**
 * Refuse to start a transfer against a URL expiring sooner than this.
 *
 * A boolean `expiresAt > now` check passes for a URL with 30 seconds left, which
 * then dies partway through a 600 MB download. Re-requesting is cheap, so the
 * margin is generous.
 */
export const URL_FRESHNESS_MARGIN_MS = 5 * 60 * 1000;

/** Request generation of a recording's media. Always creates a new job. */
export async function requestDownload(recordingId: string): Promise<DownloadJob> {
  logger.log(`[API] ⬇️  requestDownload for recording ${recordingId}`);
  const response = await authPost<unknown>(`/recordings/${encodeURIComponent(recordingId)}/download`);
  return parseDownloadJob(response, recordingId);
}

/** Poll a previously-created job. */
export async function getDownloadStatus(recordingId: string, downloadId: string): Promise<DownloadJob> {
  const path = `/recordings/${encodeURIComponent(recordingId)}/downloads/${encodeURIComponent(downloadId)}`;
  const response = await authGetJson<unknown>(path);
  return parseDownloadJob(response, recordingId);
}

export interface AwaitDownloadOptions {
  /**
   * Called once, awaited, as soon as a job exists — before any polling.
   *
   * This is the durability hook: persist the `download_id` here so that
   * dismissing Raycast mid-generation does not orphan the job. It is awaited
   * precisely so the write completes before the first sleep, which is exactly
   * when the command is most likely to be unloaded.
   */
  onJobCreated?: (job: DownloadJob) => Promise<void> | void;
  /** Called on each poll so the UI can show that work is happening. */
  onProgress?: (job: DownloadJob, elapsedMs: number) => void;
  /** Give up after this long. Default 5 minutes. */
  timeoutMs?: number;
  /** Resume polling an existing job instead of creating one. */
  existingDownloadId?: string;
  /** Abort a long generation wait. A real AbortSignal, so `AbortController` works. */
  signal?: AbortSignal;
}

export class DownloadJobError extends Error {
  readonly kind: "failed" | "expired" | "timeout" | "no_media" | "cancelled";
  readonly job?: DownloadJob;

  constructor(kind: DownloadJobError["kind"], message: string, job?: DownloadJob) {
    super(message);
    this.name = "DownloadJobError";
    this.kind = kind;
    this.job = job;
  }
}

/**
 * Drive a job to a usable media URL.
 *
 * Pass `existingDownloadId` to resume polling a job started by an earlier
 * command instance — the reason a job record is persisted the moment the POST
 * returns. Without that, dismissing Raycast during generation orphans the job
 * and the next attempt starts over.
 */
export async function awaitDownloadReady(
  recordingId: string,
  options: AwaitDownloadOptions = {},
): Promise<DownloadMedia> {
  const { onJobCreated, onProgress, timeoutMs = 5 * 60 * 1000, existingDownloadId, signal } = options;
  const startedAt = Date.now();

  let job = existingDownloadId
    ? await getDownloadStatus(recordingId, existingDownloadId)
    : await requestDownload(recordingId);

  // Awaited before the first sleep, so a dismissal during generation finds the
  // job already recorded. A persistence failure must not sink an otherwise
  // healthy download — it only costs a re-request next time.
  if (!existingDownloadId && onJobCreated) {
    try {
      await onJobCreated(job);
    } catch (error) {
      logger.warn(`[API] Could not persist download job ${job.downloadId}:`, error);
    }
  }

  onProgress?.(job, 0);

  // Backoff from 1s to 5s: generation took ~30-40s in practice, so polling every
  // 250ms would be ~150 wasted requests per download.
  let delayMs = 1000;

  while (job.status === "processing") {
    if (signal?.aborted) throw new DownloadJobError("cancelled", "Download cancelled.", job);

    const elapsed = Date.now() - startedAt;
    if (elapsed > timeoutMs) {
      throw new DownloadJobError(
        "timeout",
        "Fathom is taking longer than expected to prepare this recording. Try again shortly.",
        job,
      );
    }

    // Abort-aware: a plain sleep would keep the caller waiting up to 5s after
    // they cancelled.
    await sleep(delayMs, signal);
    if (signal?.aborted) throw new DownloadJobError("cancelled", "Download cancelled.", job);
    delayMs = Math.min(delayMs * 1.5, 5000);

    job = await getDownloadStatus(recordingId, job.downloadId);
    onProgress?.(job, Date.now() - startedAt);
  }

  if (job.status === "failed") {
    throw new DownloadJobError("failed", failureMessage(job.failureReason), job);
  }

  if (job.status === "expired") {
    throw new DownloadJobError("expired", "This download link expired. Request it again.", job);
  }

  if (!job.media) {
    // 422 territory: the job completed but there is nothing to download.
    throw new DownloadJobError("no_media", "This recording has no downloadable media.", job);
  }

  return job.media;
}

/**
 * True when a signed URL has enough life left to be worth starting a transfer.
 *
 * Fails CLOSED on expiry we cannot read. Treating a missing or unparseable
 * `expires_at` as fresh optimises for the wrong side: it saves one cheap POST
 * and risks a 600 MB transfer dying partway against a URL nobody verified. A
 * re-POST returns `completed` immediately once the media exists server-side,
 * so the pessimistic branch costs a round trip, not a regeneration.
 */
export function isMediaFresh(media: DownloadMedia, now = Date.now()): boolean {
  if (!media.expiresAt) return false;
  const expiry = Date.parse(media.expiresAt);
  if (Number.isNaN(expiry)) return false;
  return expiry - now > URL_FRESHNESS_MARGIN_MS;
}

/**
 * Get a usable URL, re-requesting if the cached one is too close to expiry.
 *
 * A repeat POST is cheap once the media exists, so this is the recovery path for
 * both "cached URL went stale" and "URL expired mid-transfer".
 */
export async function refreshMedia(recordingId: string, cached?: DownloadMedia): Promise<DownloadMedia> {
  if (cached && isMediaFresh(cached)) return cached;
  return awaitDownloadReady(recordingId);
}

/** Extension for a media file, from its content type. Never assume `.mp4`. */
export function extensionForMedia(media: DownloadMedia): string {
  const map: Record<string, string> = {
    "video/mp4": "mp4",
    "video/quicktime": "mov",
    "video/webm": "webm",
    "audio/mpeg": "mp3",
    "audio/mp4": "m4a",
    "audio/x-m4a": "m4a",
    "audio/wav": "wav",
    "audio/webm": "weba",
  };
  const normalized = media.contentType?.split(";")[0]?.trim().toLowerCase();
  if (normalized && map[normalized]) return map[normalized];

  // An unmapped but sane subtype (audio/ogg, audio/flac) is a better extension
  // than a confident lie: naming an Ogg file .m4a makes players pick the wrong
  // decoder. Anything exotic (video/x-matroska) still falls back.
  const subtype = normalized?.split("/")[1];
  if (subtype && /^[a-z0-9]{2,5}$/.test(subtype)) return subtype;

  return media.kind === "audio" ? "m4a" : "mp4";
}

function redactFailureReason(value: string | undefined): string | undefined {
  return value === undefined ? undefined : redactString(value, { level: "strict" });
}

function failureMessage(reason?: string): string {
  switch (reason) {
    case "generation_timeout":
      return "Fathom timed out preparing this recording. Try again in a few minutes.";
    case "generation_failed":
      return "Fathom could not prepare this recording for download.";
    default:
      return "Preparing this recording for download failed.";
  }
}

/** Sleep that wakes early if the signal aborts. Resolves either way. */
function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    if (signal?.aborted) return resolve();

    const timer = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, ms);

    function onAbort() {
      clearTimeout(timer);
      resolve();
    }

    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

/**
 * Parse a job response.
 *
 * Every media field is treated as optional. The docs show `"audio": null`, but
 * the API omits the key entirely — code written against the documented shape
 * (`response.audio !== null`) is wrong.
 */
function parseDownloadJob(raw: unknown, fallbackRecordingId: string): DownloadJob {
  if (!isObject(raw)) {
    throw new DownloadJobError("failed", "Fathom returned an unexpected response.");
  }

  const downloadId = toStringOrUndefined(raw["download_id"]);
  if (!downloadId) {
    throw new DownloadJobError("failed", "Fathom did not return a download identifier.");
  }
  // The id is persisted to LocalStorage and interpolated into log lines. A
  // response that put a signed URL in this field would write a bearer
  // credential to both, so anything that is not identifier-shaped is rejected
  // at the boundary rather than sanitised downstream.
  if (!/^[A-Za-z0-9_-]{1,128}$/.test(downloadId)) {
    throw new DownloadJobError("failed", "Fathom returned a malformed download identifier.");
  }

  const recordingId =
    toStringOrUndefined(raw["recording_id"]) ??
    (isNumber(raw["recording_id"]) ? String(raw["recording_id"]) : fallbackRecordingId);

  // Whichever medium exists — the API returns one, not both.
  const media = parseMedia(raw["video"], "video") ?? parseMedia(raw["audio"], "audio");

  const statusRaw = toStringOrUndefined(raw["status"]);
  let status: DownloadJobStatus;
  if (statusRaw === "completed" || statusRaw === "failed" || statusRaw === "expired") {
    status = statusRaw;
  } else if (media) {
    // An unrecognised status alongside a usable URL means the job is done and
    // Fathom renamed or added a terminal state. Polling it to the five-minute
    // timeout while holding the media we asked for is the worst reading.
    logger.warn(`[API] Unrecognised download status "${statusRaw}" with media present; treating as completed.`);
    status = "completed";
  } else {
    status = "processing";
  }

  return {
    downloadId,
    recordingId,
    status,
    media,
    // Logged verbatim on failure, so a server-supplied string could carry a
    // signed URL into the logs. `strict` drops every query string and fragment,
    // which is the level that covers a credential under an unremarkable
    // parameter name — and unlike blanking the whole URL it keeps the host and
    // path, which are the diagnostic parts.
    failureReason: redactFailureReason(toStringOrUndefined(raw["failure_reason"])),
  };
}

function parseMedia(raw: unknown, kind: MediaKind): DownloadMedia | undefined {
  if (!isObject(raw)) return undefined;

  const url = toStringOrUndefined(raw["url"]);
  if (!url) return undefined;

  const fileSizeRaw = raw["file_size_bytes"];
  return {
    kind,
    url,
    contentType: toStringOrUndefined(raw["content_type"]) ?? (kind === "audio" ? "audio/mp4" : "video/mp4"),
    fileSizeBytes: isNumber(fileSizeRaw) ? fileSizeRaw : undefined,
    expiresAt: toStringOrUndefined(raw["expires_at"]),
  };
}
