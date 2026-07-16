import { describe, expect, it } from "vitest";
import { err, ok, tryCatch } from "../../src/utils/result";

describe("Result helpers", () => {
  it("wraps success values", () => {
    const result = ok(42);
    expect(result).toEqual({ ok: true, value: 42 });
  });

  it("wraps error values", () => {
    const error = new Error("boom");
    expect(err(error)).toEqual({ ok: false, error });
  });

  it("tryCatch returns ok on success", async () => {
    const result = await tryCatch(async () => "hi");
    expect(result).toEqual({ ok: true, value: "hi" });
  });

  it("tryCatch captures thrown errors", async () => {
    const result = await tryCatch(async () => {
      throw new Error("nope");
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toBe("nope");
    }
  });

  it("tryCatch normalizes non-Error throwables", async () => {
    const result = await tryCatch(async () => {
      throw "string failure";
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBeInstanceOf(Error);
      expect(result.error.message).toBe("string failure");
    }
  });
});
