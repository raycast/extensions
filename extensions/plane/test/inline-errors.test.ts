import { describe, expect, it } from "vitest";
import { errorShownInline, inlineErrorHandler } from "../src/helpers/errors";

describe("inlineErrorHandler", () => {
  it("silences the toast only for callers that render the error", () => {
    expect(inlineErrorHandler(true)).toBe(errorShownInline);
  });

  it("keeps useCachedPromise's failure toast for forms and other callers", () => {
    expect(inlineErrorHandler(false)).toBeUndefined();
    expect(inlineErrorHandler(undefined)).toBeUndefined();
  });
});
