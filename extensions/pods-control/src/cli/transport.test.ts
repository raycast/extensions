import { execFile } from "child_process";
import { accessSync, statSync } from "fs";
import { getPreferenceValues } from "@raycast/api";
import { expect, vi, type Mock, test } from "vitest";
import { fakeTimers } from "../test/fixtures/fake-timers";
import { CliError } from "./errors";
import { runCli } from "./transport";
import type * as Fs from "fs";

vi.mock("child_process", () => ({
  execFile: vi.fn(),
}));

vi.mock("fs", async (importOriginal) => {
  const actual = await importOriginal<typeof Fs>();
  return {
    ...actual,
    accessSync: vi.fn(),
    statSync: vi.fn(),
    constants: { ...actual.constants, X_OK: 1 },
  };
});

const mockExecFile = execFile as unknown as Mock;

const mockAccessSync = vi.mocked(accessSync);

const mockStatSync = vi.mocked(statSync);

const mockGetPreferenceValues = vi.mocked(getPreferenceValues);

type ExecCallback = (
  error: (Error & { code?: number | string | null; killed?: boolean; signal?: string | number | null }) | null,
  stdout: string,
  stderr: string,
) => void;

function mockExecFileResult(
  error: (Error & { code?: number | string | null; killed?: boolean; signal?: string | number | null }) | null,
  stdout: string,
  stderr = "",
) {
  mockExecFile.mockImplementation((_file: string, _args: string[], _options: unknown, callback: ExecCallback) => {
    callback(error, stdout, stderr);
  });
}

// No CLI Path preference; the CLI exists only at `paths`.
function installCliAt(...paths: string[]) {
  mockGetPreferenceValues.mockReturnValue({} as never);
  mockStatSync.mockReturnValue({ isFile: () => true } as never);
  mockAccessSync.mockImplementation(((path: string) => {
    if (!paths.includes(path)) {
      throw new Error(`ENOENT: ${path}`);
    }
  }) as typeof accessSync);
}

test("throws a not-installed CliError when the CLI is missing", async () => {
  // Given
  installCliAt();
  // When
  const result = runCli(["listening-mode", "get"]);
  // Then
  await expect(result).rejects.toMatchObject({
    name: "CliError",
    code: "not-installed",
  });
  expect(mockExecFile).not.toHaveBeenCalled();
});

test("runs the CLI with --json appended and returns the parsed payload", async () => {
  // Given
  installCliAt("/opt/homebrew/bin/pods-control");
  mockExecFileResult(null, '{"device":"My AirPods Pro","listeningMode":"transparency","result":"ok"}');
  // When
  const payload = await runCli(["listening-mode", "get"]);
  // Then
  expect(mockExecFile).toHaveBeenCalledWith(
    "/opt/homebrew/bin/pods-control",
    ["listening-mode", "get", "--json"],
    expect.objectContaining({ encoding: "utf-8" }),
    expect.any(Function),
  );
  expect(payload).toEqual({ device: "My AirPods Pro", listeningMode: "transparency", result: "ok" });
});

test("maps the payload error identifier when the CLI exits non-zero", async () => {
  // Given
  installCliAt("/opt/homebrew/bin/pods-control");
  const error = new Error("Command failed") as Error & { code?: number };
  error.code = 4;
  mockExecFileResult(error, '{"device":"Sony","error":"unsupported","listeningMode":null,"result":"error"}');
  // When
  const result = runCli(["listening-mode", "set", "adaptive"]);
  // Then
  await expect(result).rejects.toBeInstanceOf(CliError);
  await expect(result).rejects.toMatchObject({
    code: "unsupported",
    payload: expect.objectContaining({ error: "unsupported" }),
  });
});

test.each([["read-error"], ["unavailable"], ["ambiguous-device"]] as const)(
  "maps the %s payload error to its CliError code",
  async (code) => {
    // Given
    installCliAt("/opt/homebrew/bin/pods-control");
    const error = new Error("Command failed") as Error & { code?: number };
    error.code = 70;
    mockExecFileResult(error, JSON.stringify({ device: null, error: code, result: "error" }));
    // When
    const result = runCli(["listening-mode", "get"]);
    // Then
    await expect(result).rejects.toMatchObject({
      name: "CliError",
      code,
    });
  },
);

test.each([1, 5, 6, 8, 70] as const)(
  "reports exit status %s as an unknown failure when the CLI writes no JSON",
  async (exitCode) => {
    // Given
    installCliAt("/opt/homebrew/bin/pods-control");
    const error = new Error("Command failed") as Error & { code?: number };
    error.code = exitCode;
    mockExecFileResult(error, "");
    // When
    const result = runCli(["listening-mode", "get"]);
    // Then
    await expect(result).rejects.toBeInstanceOf(CliError);
    await expect(result).rejects.toMatchObject({
      code: "unknown",
      diagnostics: { exitCode },
    });
  },
);

test("reports an unrecognized payload error as unknown when the CLI exits with status 1", async () => {
  // Given
  installCliAt("/opt/homebrew/bin/pods-control");
  const error = new Error("Command failed") as Error & { code?: number };
  error.code = 1;
  mockExecFileResult(error, JSON.stringify({ device: null, error: "firmware-busy", result: "error" }));
  // When
  const result = runCli(["listening-mode", "get"]);
  // Then
  await expect(result).rejects.toMatchObject({
    code: "unknown",
    payload: expect.objectContaining({ error: "firmware-busy" }),
    diagnostics: { exitCode: 1 },
  });
  await expect(result).rejects.toThrow("firmware-busy");
});

test("names an unrecognized payload error after a zero exit code", async () => {
  // Given
  installCliAt("/opt/homebrew/bin/pods-control");
  mockExecFileResult(null, JSON.stringify({ device: null, error: "firmware-busy", result: "error" }));
  // When
  const result = runCli(["listening-mode", "get"]);
  // Then
  await expect(result).rejects.toMatchObject({ code: "unknown" });
  await expect(result).rejects.toThrow("firmware-busy");
});

test("maps a no-op result payload without an error token", async () => {
  // Given
  installCliAt("/opt/homebrew/bin/pods-control");
  const error = new Error("Command failed") as Error & { code?: number };
  error.code = 3;
  mockExecFileResult(
    error,
    JSON.stringify({ device: "My AirPods Pro", listeningMode: "transparency", result: "no-op" }),
  );
  // When
  const result = runCli(["listening-mode", "set", "noise-cancellation"]);
  // Then
  await expect(result).rejects.toMatchObject({
    name: "CliError",
    code: "no-op",
    payload: { device: "My AirPods Pro", listeningMode: "transparency", result: "no-op" },
  });
});

test("maps a no-op result payload after a zero exit code", async () => {
  // Given
  installCliAt("/opt/homebrew/bin/pods-control");
  mockExecFileResult(
    null,
    JSON.stringify({ device: "My AirPods Pro", listeningMode: "transparency", result: "no-op" }),
  );
  // When
  const result = runCli(["listening-mode", "set", "noise-cancellation"]);
  // Then
  await expect(result).rejects.toMatchObject({
    name: "CliError",
    code: "no-op",
    payload: { device: "My AirPods Pro", listeningMode: "transparency", result: "no-op" },
  });
});

test("rejects non-empty malformed JSON whatever the exit status", async () => {
  // Given
  installCliAt("/opt/homebrew/bin/pods-control");
  const error = new Error("Command failed") as Error & { code?: number };
  error.code = 1;
  mockExecFileResult(error, "not json");
  // When
  const result = runCli(["listening-mode", "get"]);
  // Then
  await expect(result).rejects.toMatchObject({
    name: "CliError",
    code: "invalid-response",
  });
});

test("distinguishes an externally killed process from a timeout", async () => {
  // Given
  installCliAt("/opt/homebrew/bin/pods-control");
  const error = new Error("Command failed") as Error & { killed?: boolean; signal?: string };
  error.killed = true;
  error.signal = "SIGKILL";
  mockExecFileResult(error, "", "killed by test");
  // When
  const result = runCli(["listening-mode", "get"]);
  // Then
  await expect(result).rejects.toMatchObject({
    code: "unknown",
    diagnostics: { kind: "killed", signal: "SIGKILL", stderr: "killed by test" },
  });
  await expect(result).rejects.toThrow("terminated by SIGKILL");
});

test("distinguishes max-buffer failures from timeouts and killed processes", async () => {
  // Given
  installCliAt("/opt/homebrew/bin/pods-control");
  const error = new Error("stdout maxBuffer length exceeded") as Error & { code?: string };
  error.code = "ERR_CHILD_PROCESS_STDIO_MAXBUFFER";
  mockExecFileResult(error, "", "CLI output was truncated");
  // When
  const result = runCli(["listening-mode", "get"]);
  // Then
  await expect(result).rejects.toMatchObject({
    code: "unknown",
    diagnostics: { kind: "max-buffer", stderr: "CLI output was truncated" },
  });
  await expect(result).rejects.toThrow("too much output");
});

test("reports a timeout separately from a killed process", async () => {
  // Given
  installCliAt("/opt/homebrew/bin/pods-control");
  using timers = fakeTimers();
  let callback: ExecCallback | undefined;
  const child = { kill: vi.fn() };
  mockExecFile.mockImplementation((_file: string, _args: string[], _options: unknown, next: ExecCallback) => {
    callback = next;
    return child as never;
  });
  // When
  const pending = runCli(["listening-mode", "get"]);
  await vi.advanceTimersByTimeAsync(15000);
  callback?.(Object.assign(new Error("timed out"), { killed: true, signal: "SIGTERM" }), "", "slow CLI");
  // Then
  await expect(pending).rejects.toMatchObject({
    code: "unknown",
    diagnostics: { kind: "timeout", signal: "SIGTERM", stderr: "slow CLI" },
  });
  await expect(pending).rejects.toThrow("timed out");
  expect(child.kill).toHaveBeenCalledWith("SIGTERM");
});

test("force-kills a timed-out CLI that ignores SIGTERM and reports a timeout", async () => {
  // Given
  installCliAt("/opt/homebrew/bin/pods-control");
  using timers = fakeTimers();
  let callback: ExecCallback | undefined;
  const child = {
    kill: vi.fn((signal: string) => {
      if (signal === "SIGKILL") {
        callback?.(Object.assign(new Error("killed"), { killed: true, signal }), "", "stuck CLI");
      }
      return true;
    }),
  };
  mockExecFile.mockImplementation((_file: string, _args: string[], _options: unknown, next: ExecCallback) => {
    callback = next;
    return child as never;
  });
  // When
  const pending = runCli(["listening-mode", "get"]);
  const outcome = expect(pending).rejects.toMatchObject({
    code: "unknown",
    diagnostics: { kind: "timeout", signal: "SIGKILL", stderr: "stuck CLI" },
  });
  await vi.advanceTimersByTimeAsync(15000);
  // Then
  expect(child.kill.mock.calls).toEqual([["SIGTERM"]]);
  // When
  await vi.advanceTimersByTimeAsync(2000);
  // Then
  expect(child.kill.mock.calls).toEqual([["SIGTERM"], ["SIGKILL"]]);
  await outcome;
});

test("preserves a valid interrupted payload and its signal", async () => {
  // Given
  installCliAt("/opt/homebrew/bin/pods-control");
  const error = new Error("Command interrupted") as Error & { code?: number };
  error.code = 130;
  mockExecFileResult(error, JSON.stringify({ result: "interrupted", signal: 2 }), "interrupted by CLI");
  // When
  const result = runCli(["listening-mode", "get"]);
  // Then
  await expect(result).rejects.toMatchObject({
    code: "unknown",
    payload: { result: "interrupted", signal: 2 },
    diagnostics: { kind: "process", signal: 2, stderr: "interrupted by CLI" },
  });
});

test("rejects a malformed successful envelope instead of classifying it as unsupported", async () => {
  // Given
  installCliAt("/opt/homebrew/bin/pods-control");
  mockExecFileResult(null, JSON.stringify({ result: "ok", device: "AirPods" }));
  // When
  const result = runCli(["conversation-awareness", "get"]);
  // Then
  await expect(result).rejects.toMatchObject({
    code: "invalid-response",
  });
});

test("rejects malformed known field shapes", async () => {
  // Given
  installCliAt("/opt/homebrew/bin/pods-control");
  mockExecFileResult(
    null,
    JSON.stringify({ result: "ok", device: "AirPods", listeningMode: { mode: "transparency" } }),
  );
  // When
  const result = runCli(["listening-mode", "get"]);
  // Then
  await expect(result).rejects.toMatchObject({ code: "invalid-response" });
});

test("throws when the payload reports an error despite a zero exit code", async () => {
  // Given
  installCliAt("/opt/homebrew/bin/pods-control");
  mockExecFileResult(null, '{"device":null,"error":"no-device","listeningMode":null,"result":"error"}');
  // When
  const result = runCli(["listening-mode", "get"]);
  // Then
  await expect(result).rejects.toMatchObject({
    name: "CliError",
    code: "no-device",
  });
});
