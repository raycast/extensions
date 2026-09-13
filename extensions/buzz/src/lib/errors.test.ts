import { describe, it, expect } from "vitest";
import { errorMessage } from "./errors";

describe("errorMessage", () => {
  it("returns an Error's message, without the class name or stack", () => {
    expect(errorMessage(new Error("Relay rejected the request: read-only"))).toBe(
      "Relay rejected the request: read-only",
    );
  });

  it("keeps the message of an Error subclass", () => {
    class RelayError extends Error {}
    expect(errorMessage(new RelayError("restricted"))).toBe("restricted");
  });

  it("passes a thrown string straight through", () => {
    expect(errorMessage("socket closed")).toBe("socket closed");
  });

  it("stringifies a thrown non-Error value rather than dropping it", () => {
    expect(errorMessage(404)).toBe("404");
    expect(errorMessage(null)).toBe("null");
    expect(errorMessage(undefined)).toBe("undefined");
  });

  it("uses a thrown object's own toString when it has one", () => {
    expect(errorMessage({ toString: () => "custom reason" })).toBe("custom reason");
  });
});
