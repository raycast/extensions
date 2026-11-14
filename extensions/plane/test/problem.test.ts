import { describe, expect, it } from "vitest";
import { extractErrorMessage, formatProblem, parseProblem, parseRetryAfter } from "../src/helpers/problem";
import { describePlaneError } from "../src/helpers/errors";

describe("problem+json", () => {
  const validation = {
    type: "invalid_request",
    code: "invalid_request",
    detail: "One or more fields failed validation.",
    errors: [
      {
        field: "state_group",
        code: "invalid_choice",
        message: "Select a valid choice. in_progress is not one of the available choices.",
      },
      { field: "fields", code: "invalid", message: "Unknown field(s): titel" },
    ],
  };

  it("parses the RFC 9457 shape", () => {
    expect(parseProblem(validation)).toMatchObject({ type: "invalid_request", code: "invalid_request" });
    expect(parseProblem(validation)?.errors).toHaveLength(2);
    expect(parseProblem({ detail: "Not found." })).toBeUndefined();
    expect(parseProblem("Not found")).toBeUndefined();
    expect(parseProblem(null)).toBeUndefined();
  });

  it("formats detail with field errors", () => {
    expect(formatProblem(parseProblem(validation)!)).toBe(
      "One or more fields failed validation. (state_group: Select a valid choice. in_progress is not one of the available choices.; fields: Unknown field(s): titel)",
    );
    expect(
      extractErrorMessage({ type: "not_found", code: "not_found", detail: "The requested resource was not found." }),
    ).toBe("The requested resource was not found.");
  });

  it("still reads v1 and custom-filter bodies", () => {
    expect(extractErrorMessage({ error: "Project not found" })).toBe("Project not found");
    expect(extractErrorMessage({ detail: "state_group: triage is not a valid choice" })).toBe(
      "state_group: triage is not a valid choice",
    );
    expect(extractErrorMessage({ name: ["This field is required."] })).toBe("name: This field is required.");
    expect(extractErrorMessage("")).toBeUndefined();
  });

  it("parses Retry-After as seconds or an HTTP date", () => {
    const now = Date.UTC(2026, 9, 14, 12, 0, 0);
    expect(parseRetryAfter("30", now)).toBe(30);
    expect(parseRetryAfter(new Date(now + 5_000).toUTCString(), now)).toBe(5);
    expect(parseRetryAfter(new Date(now - 5_000).toUTCString(), now)).toBe(0);
    expect(parseRetryAfter("soon", now)).toBeUndefined();
    expect(parseRetryAfter(null, now)).toBeUndefined();
  });

  it("describes rate limits and plan gates", () => {
    expect(describePlaneError({ status: 429, retryAfter: 12 }).message).toContain("12 second");
    expect(describePlaneError({ status: 429 }).message).toContain("60 requests per minute");
    expect(
      describePlaneError({ status: 402, message: "This feature is not available on your current plan." }).title,
    ).toBe("Not available on your Plane plan");
  });
});
