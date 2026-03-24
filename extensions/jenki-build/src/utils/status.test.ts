import { describe, it, expect } from "vitest";
import { normalizeJobStatus } from "./status";

describe("normalizeJobStatus", () => {
  it('maps "blue" to "success"', () => {
    expect(normalizeJobStatus("blue")).toBe("success");
  });

  it('maps "red" to "failure"', () => {
    expect(normalizeJobStatus("red")).toBe("failure");
  });

  it('maps "aborted" to "aborted"', () => {
    expect(normalizeJobStatus("aborted")).toBe("aborted");
  });

  it('maps "disabled" to "disabled"', () => {
    expect(normalizeJobStatus("disabled")).toBe("disabled");
  });

  it('maps "notbuilt" to "disabled"', () => {
    expect(normalizeJobStatus("notbuilt")).toBe("disabled");
  });

  it('maps "grey" to "disabled"', () => {
    expect(normalizeJobStatus("grey")).toBe("disabled");
  });

  it('maps "blue_anime" to "running"', () => {
    expect(normalizeJobStatus("blue_anime")).toBe("running");
  });

  it('maps "red_anime" to "running"', () => {
    expect(normalizeJobStatus("red_anime")).toBe("running");
  });

  it('maps "aborted_anime" to "running"', () => {
    expect(normalizeJobStatus("aborted_anime")).toBe("running");
  });

  it('maps unknown value to "disabled" (fallback)', () => {
    expect(normalizeJobStatus("unknown_value")).toBe("disabled");
  });

  it('maps empty string to "disabled" (fallback)', () => {
    expect(normalizeJobStatus("")).toBe("disabled");
  });
});
