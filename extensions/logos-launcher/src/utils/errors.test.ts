import { describe, it, expect } from "vitest";
import { extractErrorMessage } from "./errors";

describe("extractErrorMessage", () => {
  it("extracts message from Error instance", () => {
    const error = new Error("Something went wrong");
    expect(extractErrorMessage(error)).toBe("Something went wrong");
  });

  it("converts string to string", () => {
    expect(extractErrorMessage("plain string error")).toBe("plain string error");
  });

  it("converts number to string", () => {
    expect(extractErrorMessage(404)).toBe("404");
  });

  it("converts null to string", () => {
    expect(extractErrorMessage(null)).toBe("null");
  });

  it("converts undefined to string", () => {
    expect(extractErrorMessage(undefined)).toBe("undefined");
  });

  it("converts object to string", () => {
    expect(extractErrorMessage({ code: "ENOENT" })).toBe("[object Object]");
  });

  it("handles Error with empty message", () => {
    const error = new Error("");
    expect(extractErrorMessage(error)).toBe("");
  });
});
