import { retryPolicies, type RetryOptions } from "@slack/web-api";
import { isRateLimitError } from "./rateLimit";

/** HTTP 5xx and timeouts stop after this many retries. Rate limits keep Slack's default budget. */
const transientFailureRetries = 2;

type FailedAttempt = Error & { attemptNumber: number };

/**
 * Slack forwards `retryConfig` to `p-retry`. `onFailedAttempt` is honored at runtime even though
 * `RetryOptions` does not list it. Throwing from that callback aborts the remaining retries.
 */
export type SlackClientRetryConfig = RetryOptions & {
  onFailedAttempt?: (error: FailedAttempt) => void | Promise<void>;
};

/**
 * Rate-limit responses keep Slack's default retry budget. The SDK already waits for `Retry-After` before asking
 * `p-retry` to try again. Other failures abort once two retries are used, so a timeout or HTTP 5xx cannot sit in a
 * loading state for the default ~30 minutes.
 */
export function slackRetryConfig(): SlackClientRetryConfig {
  return {
    ...retryPolicies.tenRetriesInAboutThirtyMinutes,
    onFailedAttempt(error) {
      if (isRateLimitError(error)) return;
      if (error.attemptNumber > transientFailureRetries) throw error;
    },
  };
}
