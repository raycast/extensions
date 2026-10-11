import assert from "node:assert/strict";
import test from "node:test";
import { slackRetryConfig } from "./retryPolicy";

const rateLimited = (attemptNumber: number) =>
  Object.assign(new Error("A rate limit was exceeded (url: users.list, retry-after: 30)"), { attemptNumber });

const serverError = (attemptNumber: number) =>
  Object.assign(new Error("Request failed with status code 500"), { attemptNumber });

test("rate limits keep Slack's default retry budget", () => {
  const config = slackRetryConfig();
  assert.equal(config.retries, 10);
  assert.doesNotThrow(() => config.onFailedAttempt?.(rateLimited(10)));
});

test("timeouts and server errors stop after two retries", () => {
  const config = slackRetryConfig();
  assert.doesNotThrow(() => config.onFailedAttempt?.(serverError(1)));
  assert.doesNotThrow(() => config.onFailedAttempt?.(serverError(2)));
  assert.throws(() => config.onFailedAttempt?.(serverError(3)), /status code 500/);
});
