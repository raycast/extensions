import { describe, expect, it } from "vitest";

import { isTransientUploadError, retryWithBackoff } from "../storage";

describe("retryWithBackoff", () => {
  it("retries transient failures and eventually succeeds", async () => {
    let attempts = 0;
    const result = await retryWithBackoff(
      async () => {
        attempts += 1;
        if (attempts < 3) {
          throw new Error("network timeout");
        }
        return "ok";
      },
      {
        maxRetries: 3,
        shouldRetry: isTransientUploadError,
        delayMs: () => 0,
        sleep: async () => Promise.resolve(),
      },
    );

    expect(result.value).toBe("ok");
    expect(result.attempts).toBe(3);
  });

  it("does not retry non-transient errors", async () => {
    let attempts = 0;
    await expect(
      retryWithBackoff(
        async () => {
          attempts += 1;
          const error = new Error("access denied");
          (error as Error & { $metadata?: { httpStatusCode: number } }).$metadata = { httpStatusCode: 403 };
          throw error;
        },
        {
          maxRetries: 3,
          shouldRetry: isTransientUploadError,
          delayMs: () => 0,
          sleep: async () => Promise.resolve(),
        },
      ),
    ).rejects.toThrow("access denied");

    expect(attempts).toBe(1);
  });
});

describe("isTransientUploadError", () => {
  it("treats 5xx and 429 as transient", () => {
    expect(isTransientUploadError({ $metadata: { httpStatusCode: 503 } })).toBe(true);
    expect(isTransientUploadError({ $metadata: { httpStatusCode: 429 } })).toBe(true);
  });

  it("treats 4xx authorization errors as non-transient", () => {
    expect(isTransientUploadError({ $metadata: { httpStatusCode: 403 } })).toBe(false);
  });
});
