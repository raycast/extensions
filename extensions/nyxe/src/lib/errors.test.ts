import { describe, expect, it } from "vitest";
import { NyxeApiError } from "./api";
import { describeError } from "./errors";

describe("describeError", () => {
  it("sends a 401 to the token settings", () => {
    expect(describeError(new NyxeApiError(401, "unauthorized", "x"))).toMatchObject({
      title: "Your Nyxe token isn't working",
      offerTokens: true,
    });
  });

  it("names the missing scope on a 403", () => {
    expect(describeError(new NyxeApiError(403, "insufficient_scope", "x", "mail:send"))).toMatchObject({
      title: "Token is missing the mail:send scope",
      offerTokens: true,
    });
  });

  it("says slow down on a 429, keeping a specific server reason", () => {
    expect(
      describeError(new NyxeApiError(429, "rate_limited", "Slow down. Too many requests.", undefined, 30)),
    ).toEqual({
      title: "Slow down",
      message: "Try again in 30s.",
      offerTokens: false,
    });
    const freeTier = "You've hit the daily send limit for a free account.";
    expect(describeError(new NyxeApiError(429, "rate_limited", freeTier))).toMatchObject({
      title: "Slow down",
      message: freeTier,
    });
  });

  it("passes other API messages through, and handles plain errors", () => {
    expect(describeError(new NyxeApiError(404, "not_found", "Thread T1 not found"))).toMatchObject({
      title: "Nyxe couldn't do that",
      message: "Thread T1 not found",
    });
    expect(describeError(new Error("boom"))).toMatchObject({ title: "Something went wrong", message: "boom" });
  });
});
