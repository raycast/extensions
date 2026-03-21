import { describe, it, expect } from "vitest";
import { JenkinsApiError, assertOk, handleFetchError } from "./errors";

describe("assertOk", () => {
  it("does not throw for status 200", () => {
    expect(() => assertOk({ ok: true, status: 200 })).not.toThrow();
  });

  it("throws JenkinsApiError for status 401 with auth message", () => {
    expect(() => assertOk({ ok: false, status: 401 })).toThrowError(
      "Authentication failed — check your API token in preferences",
    );
  });

  it("throws JenkinsApiError for status 403 with auth message", () => {
    expect(() => assertOk({ ok: false, status: 403 })).toThrowError(
      "Authentication failed — check your API token in preferences",
    );
  });

  it("throws JenkinsApiError for status 404 with job not found message", () => {
    expect(() => assertOk({ ok: false, status: 404 })).toThrowError(
      "Job not found",
    );
  });

  it("throws JenkinsApiError for status 500 with generic message", () => {
    expect(() => assertOk({ ok: false, status: 500 })).toThrowError(
      "Jenkins returned 500",
    );
  });
});

describe("handleFetchError", () => {
  it("returns connect error message for TypeError", () => {
    expect(handleFetchError(new TypeError("Failed to fetch"))).toBe(
      "Cannot connect to Jenkins — check the URL in preferences",
    );
  });

  it("returns error message for JenkinsApiError", () => {
    const err = new JenkinsApiError(404, "Job not found");
    expect(handleFetchError(err)).toBe("Job not found");
  });

  it("returns generic message for unknown Error", () => {
    expect(handleFetchError(new Error("something broke"))).toBe(
      "something broke",
    );
  });
});
