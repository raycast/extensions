/**
 * `isAbortError` decides whether an in-progress toast has to clear itself.
 *
 * It is the one ending that raises no toast of its own — `showBrewFailureToast`
 * returns early on an abort — so a false negative leaves an animated toast
 * spinning after the user has navigated away, and a false positive dismisses
 * the failure toast that a real error just raised.
 */

import { describe, expect, it } from "vitest";
import { isAbortError } from "./errors";

describe("isAbortError", () => {
  it("recognises the abort a DOM AbortController raises", () => {
    // What `AbortController.abort()` produces, and what `execBrew` re-throws.
    const aborted = new Error("The operation was aborted");
    aborted.name = "AbortError";
    expect(isAbortError(aborted)).toBe(true);
  });

  it("does not treat an ordinary failure as an abort", () => {
    expect(isAbortError(new Error("Error: jq not installed"))).toBe(false);
    expect(isAbortError(new TypeError("x is not a function"))).toBe(false);
  });

  it("does not match a non-Error that merely carries the name", () => {
    // A bare object would slip through a `.name` check alone; the toast it
    // would wrongly dismiss belongs to a real error.
    expect(isAbortError({ name: "AbortError" })).toBe(false);
    expect(isAbortError("AbortError")).toBe(false);
    expect(isAbortError(undefined)).toBe(false);
    expect(isAbortError(null)).toBe(false);
  });
});
