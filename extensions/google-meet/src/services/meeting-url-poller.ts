import { MeetError } from "../errors";
import { selectMeetingUrl } from "../utils/meeting-url";

export type PollOptions = {
  timeoutMs: number;
  intervalMs: number;
  /**
   * Optional hook letting the caller replace the generic timeout with a more
   * specific {@link MeetError} once the deadline has expired — used by
   * adapters whose failure modes are only distinguishable in hindsight.
   */
  describeTimeout?: () => Promise<MeetError | undefined>;
};

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Polls `getCandidates` at a fixed interval until it returns a valid
 * meeting URL, or throws {@link MeetError} `"MEETING_URL_TIMEOUT"` once
 * `options.timeoutMs` elapses. Replaces the previous unbounded, delay-free
 * recursive lookup: there's now a delay between attempts, a hard deadline,
 * and no recursion. A `MeetError` thrown by `getCandidates` itself (e.g. a
 * missing permission) is treated as fatal and propagates immediately
 * instead of being retried until the deadline — so `getCandidates` must only
 * throw for conditions no later poll could recover from. `options.describeTimeout`
 * is the escape hatch for the rest: it runs only after the deadline expires.
 */
export async function waitForMeetingUrl(getCandidates: () => Promise<string[]>, options: PollOptions): Promise<string> {
  const deadline = Date.now() + options.timeoutMs;

  for (;;) {
    const candidates = await getCandidates();
    const url = selectMeetingUrl(candidates);
    if (url) {
      return url;
    }

    const remainingMs = deadline - Date.now();
    if (remainingMs <= 0) {
      throw (await options.describeTimeout?.()) ?? new MeetError("MEETING_URL_TIMEOUT");
    }

    await sleep(Math.min(options.intervalMs, remainingMs));
  }
}
