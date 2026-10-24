import { describe, expect, it } from "vitest";
import { toErrorMessage } from "../../src/helpers/errors";

describe("toErrorMessage", () => {
  it("uses an Error's message", () => {
    expect(toErrorMessage(new Error("Token expired"))).toBe("Token expired");
  });

  it("uses a thrown string", () => {
    expect(toErrorMessage("Boom")).toBe("Boom");
  });

  it("falls back only when there is no message at all", () => {
    expect(toErrorMessage({})).toBe(
      "Something failed without giving a reason. Try again, and open an issue if it keeps happening.",
    );
  });
});
