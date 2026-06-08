import { describe, expect, it } from "vitest";

import { err, isErr, isOk, ok, unwrapOr } from "./result";

describe("shared/result", () => {
  it("supports ok and err helpers", () => {
    const success = ok("value");
    const failure = err(new Error("boom"));

    expect(isOk(success)).toBe(true);
    expect(isErr(failure)).toBe(true);
    expect(unwrapOr(success, "fallback")).toBe("value");
    expect(unwrapOr(failure, "fallback")).toBe("fallback");
  });
});
