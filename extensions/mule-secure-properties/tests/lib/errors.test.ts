import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@raycast/api", () => ({
  environment: {
    supportPath: "/tmp/mule-secure-properties",
  },
  showToast: vi.fn(),
  Toast: { Style: { Failure: "failure", Success: "success" } },
}));

import { showToast, Toast } from "@raycast/api";
import { getErrorMessage, getUserFriendlyErrorMessage, handleOperationError } from "../../src/utils";

describe("getErrorMessage", () => {
  it("returns Error.message when available", () => {
    expect(getErrorMessage(new Error("boom"))).toBe("boom");
  });

  it("returns a fallback for unknown values", () => {
    expect(getErrorMessage("nope")).toBe("An unexpected error occurred.");
  });
});

describe("getUserFriendlyErrorMessage", () => {
  it("maps known cryptography failures", () => {
    expect(getUserFriendlyErrorMessage("Given final block not properly padded")).toContain(
      "wrong password, mode/algorithm mismatch",
    );
  });

  it("maps AES key size failures", () => {
    expect(getUserFriendlyErrorMessage("Illegal key size")).toContain("16, 24, or 32 characters");
  });

  it("falls back with the original error for unknown failures", () => {
    const message = getUserFriendlyErrorMessage("weird failure");
    expect(message).toContain("Something went wrong");
    expect(message).toContain("weird failure");
  });
});

describe("handleOperationError", () => {
  beforeEach(() => {
    vi.mocked(showToast).mockReset();
  });

  it("shows a failure toast for the operation", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);

    await handleOperationError(new Error("Base64 decode failed"), "Decryption");

    expect(showToast).toHaveBeenCalledWith({
      style: Toast.Style.Failure,
      title: "Decryption Error",
      message: expect.stringContaining("Invalid Base64 encoding"),
    });
    expect(consoleError).toHaveBeenCalledWith("Decryption error: Base64 decode failed");

    consoleError.mockRestore();
  });

  it("does not log a raw error object", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const error = Object.assign(new Error("Tool execution failed."), {
      command: "java password plaintext",
      stderr: "password plaintext",
    });

    await handleOperationError(error, "Encryption");

    expect(consoleError).toHaveBeenCalledWith("Encryption error: Tool execution failed.");
    expect(consoleError).not.toHaveBeenCalledWith(expect.anything(), error);

    consoleError.mockRestore();
  });
});
