import { describe, expect, it } from "vitest";
import {
  explainAIError,
  isModelNotFound,
  shouldRetryWithoutUsage,
} from "./ai-error";

describe("AI request errors", () => {
  it("explains policy and upstream blocks without exposing a raw HTTP error", () => {
    expect(
      explainAIError({ status: 403, message: "Your request was blocked." }),
    ).toEqual({
      title: "Request Blocked",
      message:
        "EveryAPI or the selected provider blocked this request. Try another model; if every model fails, check Service Status.",
    });
  });

  it("distinguishes authentication, rate limit, and unavailable errors", () => {
    expect(explainAIError({ status: 401 }).title).toBe("Session Expired");
    expect(explainAIError({ status: 429 }).title).toBe("Too Many Requests");
    expect(explainAIError({ status: 503 }).title).toBe("Model Unavailable");
  });

  it("keeps a safe message for unknown failures", () => {
    expect(explainAIError(new Error("Network connection lost"))).toEqual({
      title: "Request Failed",
      message: "Network connection lost",
    });
  });

  it("retries without stream usage only for request-shape errors", () => {
    expect(shouldRetryWithoutUsage({ status: 400 })).toBe(true);
    expect(shouldRetryWithoutUsage({ status: 422 })).toBe(true);
    for (const status of [401, 403, 429, 500, 503]) {
      expect(shouldRetryWithoutUsage({ status })).toBe(false);
    }
  });

  it("recognizes only explicit model-not-found responses", () => {
    expect(
      isModelNotFound({ status: 404, message: "Model not found foo" }),
    ).toBe(true);
    expect(isModelNotFound({ status: 404, message: "Route not found" })).toBe(
      false,
    );
    expect(isModelNotFound({ status: 403, message: "Model not found" })).toBe(
      false,
    );
  });
});
