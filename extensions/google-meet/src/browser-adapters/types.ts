/**
 * A source of candidate meeting URLs for one browser (or browser family).
 */
export interface MeetingUrlSource {
  /**
   * Returns candidate meeting URLs found right now, ordered with the most
   * likely match first. Returns an empty array when nothing matches yet —
   * callers should keep polling — and throws a {@link MeetError} for fatal,
   * non-retryable conditions such as a missing permission or a window type
   * that can't be scripted at all.
   */
  getCandidateUrls(): Promise<string[]>;

  /**
   * True for adapters (Firefox family) that read the URL by copying the
   * address bar to the system clipboard. Callers use this to decide whether
   * the user's original clipboard contents need to be saved and restored
   * around polling.
   */
  usesClipboardFallback: boolean;
}
