import { MeetError } from "../errors";
import { selectMeetingUrl } from "../utils/meeting-url";

export type PollOptions = {
  timeoutMs: number;
  intervalMs: number;
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
 * instead of being retried until the deadline.
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
      throw new MeetError("MEETING_URL_TIMEOUT");
    }

    await sleep(Math.min(options.intervalMs, remainingMs));
  }
}
