import { execFile } from "child_process";
import { accessSync } from "fs";
import { expect, vi, test } from "vitest";
import { detectDeveloperTools } from "./developer-tools";

vi.mock("child_process", () => ({ execFile: vi.fn() }));

vi.mock("fs", () => ({ accessSync: vi.fn(), constants: { X_OK: 1 } }));

const exec = vi.mocked(execFile);

function mockXcodeSelectAvailable() {
  vi.mocked(accessSync).mockImplementation(() => undefined);
}

function mockXcodeSelectUnavailable() {
  vi.mocked(accessSync).mockImplementation(() => {
    throw new Error("ENOENT");
  });
}

// Each command succeeds unless `failure` returns an error for it.
function mockCommands(failure: (file: string, args: readonly string[]) => Error | null = () => null) {
  exec.mockImplementation((file, args, _options, callback) => {
    if (typeof callback === "function") callback(failure(String(file), Array.isArray(args) ? args : []), "", "");
    return {} as ReturnType<typeof execFile>;
  });
}

test("accepts a working selected Swift toolchain, including full Xcode", async () => {
  // Given
  mockXcodeSelectAvailable();
  mockCommands();
  // When
  const result = await detectDeveloperTools();
  // Then
  expect(result).toBe("ready");
  expect(exec).toHaveBeenNthCalledWith(1, "/usr/bin/xcode-select", ["-p"], expect.anything(), expect.any(Function));
  expect(exec).toHaveBeenNthCalledWith(
    2,
    "/usr/bin/xcrun",
    ["swiftc", "--version"],
    expect.anything(),
    expect.any(Function),
  );
});

test("reports developer tools as unavailable when xcode-select is absent", async () => {
  // Given
  mockXcodeSelectUnavailable();
  mockCommands();
  // When
  const result = await detectDeveloperTools();
  // Then
  expect(result).toBe("unavailable");
  expect(exec).not.toHaveBeenCalled();
});

test("does not invoke xcrun without a selected toolchain", async () => {
  // Given
  mockXcodeSelectAvailable();
  mockCommands((file) => (file === "/usr/bin/xcode-select" ? new Error("no developer directory") : null));
  // When
  const result = await detectDeveloperTools();
  // Then
  expect(result).toBe("missing");
  expect(exec).toHaveBeenCalledTimes(1);
});

test("detects a broken Swift compiler even when xcode-select succeeds", async () => {
  // Given
  mockXcodeSelectAvailable();
  mockCommands((file) => (file === "/usr/bin/xcrun" ? new Error("broken compiler") : null));
  // When
  const result = await detectDeveloperTools();
  // Then
  expect(result).toBe("missing");
});

test("requires clang as well as Swift for the companion library", async () => {
  // Given
  mockXcodeSelectAvailable();
  mockCommands((_file, args) => (args[0] === "clang" ? new Error("missing clang") : null));
  // When
  const result = await detectDeveloperTools();
  // Then
  expect(result).toBe("missing");
});
