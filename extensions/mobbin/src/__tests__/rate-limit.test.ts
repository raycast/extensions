import { describe, expect, it, vi } from "vitest";
import { MobbinError } from "../lib/errors";
import { parseRetryAfterSeconds, withRateLimitRetry } from "../lib/rate-limit";

describe("parseRetryAfterSeconds", () => {
  it("parses numeric retry-after values", () => {
    expect(parseRetryAfterSeconds("12")).toBe(12);
    expect(parseRetryAfterSeconds("0")).toBe(0);
  });

  it("parses HTTP-date retry-after values", () => {
    const future = new Date(Date.now() + 2_000).toUTCString();
    expect(parseRetryAfterSeconds(future)).toBeGreaterThanOrEqual(1);
  });

  it("returns undefined for invalid values", () => {
    expect(parseRetryAfterSeconds("nope")).toBeUndefined();
  });

  it("retries at most three total attempts", async () => {
    vi.useFakeTimers();
    const operation = vi.fn(async () => {
      throw new MobbinError("limited", "rate-limited", {
        retryAfterSeconds: 0,
      });
    });
    const pending = withRateLimitRetry(operation).catch(
      (error: unknown) => error,
    );
    await vi.runAllTimersAsync();
    await expect(pending).resolves.toMatchObject({
      code: "rate-limited",
    });
    expect(operation).toHaveBeenCalledTimes(3);
    vi.useRealTimers();
  });

  it("aborts a pending retry delay", async () => {
    vi.useFakeTimers();
    const controller = new AbortController();
    const operation = vi.fn(async () => {
      throw new MobbinError("limited", "rate-limited", {
        retryAfterSeconds: 30,
      });
    });
    const pending = withRateLimitRetry(operation, controller.signal).catch(
      (error: unknown) => error,
    );
    await Promise.resolve();
    controller.abort();
    await expect(pending).resolves.toMatchObject({
      name: "AbortError",
    });
    expect(operation).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });
});
