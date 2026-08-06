import type { MeetError } from "../errors";

/**
 * A source of candidate meeting URLs for one browser (or browser family).
 */
export interface MeetingUrlSource {
  /**
   * Returns candidate meeting URLs found right now, ordered with the most
   * likely match first. Returns an empty array when nothing matches yet —
   * callers should keep polling — and throws a {@link MeetError} only for
   * genuinely fatal, non-retryable conditions such as a missing permission.
   *
   * A browser state that a later poll could recover from must never throw:
   * a throw aborts the whole detection window, so anything transient belongs
   * in {@link describeTimeout} instead.
   */
  getCandidateUrls(): Promise<string[]>;

  /**
   * Optional hook called once the detection deadline expires, giving an
   * adapter the chance to replace the generic timeout with a more specific
   * {@link MeetError} based on what it saw while polling. Returning
   * `undefined` (or not implementing it) keeps the generic timeout.
   */
  describeTimeout?(): Promise<MeetError | undefined>;

  /**
   * True for adapters (Firefox family) that read the URL by copying the
   * address bar to the system clipboard. Callers use this to decide whether
   * the user's original clipboard contents need to be saved and restored
   * around polling.
   */
  usesClipboardFallback: boolean;
}
