import { describe, expect, it } from "vitest";
import { autoAiReady, withoutLoading } from "../../src/icons/ai";

describe("withoutLoading", () => {
  it("drops a call the changed query aborted, so typing the same words again asks again", () => {
    expect(withoutLoading({ query: "save money", status: "loading" })).toBeUndefined();
  });

  it("keeps a finished answer or an error", () => {
    const done = { query: "save money", status: "done" };
    const failed = { query: "save money", status: "error" };
    expect(withoutLoading(done)).toBe(done);
    expect(withoutLoading(failed)).toBe(failed);
    expect(withoutLoading(undefined)).toBeUndefined();
  });
});

describe("autoAiReady", () => {
  it("waits for the icons and saved keywords, so a first download doesn't spend AI calls", () => {
    expect(autoAiReady(true, false, true)).toBe(false);
    expect(autoAiReady(true, true, false)).toBe(false);
    expect(autoAiReady(true, true, true)).toBe(true);
  });

  it("stays off when the setting is off", () => {
    expect(autoAiReady(false, true, true)).toBe(false);
  });
});
