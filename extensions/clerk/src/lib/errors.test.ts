import { describe, it, expect, vi } from "vitest";

vi.mock("@raycast/api", () => ({
  showToast: vi.fn(),
  Toast: { Style: { Failure: "failure" } },
}));

import { normalizeClerkError } from "./errors";

function clerkError(status: number, message: string) {
  return { clerkError: true, status, errors: [{ code: "x", message }] };
}

describe("normalizeClerkError", () => {
  it("maps 401/403 to a key-rejected message", () => {
    expect(normalizeClerkError(clerkError(401, "nope")).title).toMatch(/rejected/i);
    expect(normalizeClerkError(clerkError(403, "nope")).title).toMatch(/rejected/i);
  });
  it("maps 429 to a rate-limit message", () => {
    expect(normalizeClerkError(clerkError(429, "slow")).title).toMatch(/rate limit/i);
  });
  it("uses the first clerk error message for other statuses", () => {
    expect(normalizeClerkError(clerkError(422, "bad slug")).message).toBe("bad slug");
  });
  it("falls back to the Error message for non-clerk errors", () => {
    const r = normalizeClerkError(new Error("network down"));
    expect(r.message).toBe("network down");
  });
  it("handles unknown values", () => {
    expect(normalizeClerkError("weird").message).toBeTruthy();
  });
});
