import { getPreferenceValues } from "@raycast/api";
import { expect, vi, test } from "vitest";
import { CliError } from "../../cli/errors";
import { runCli } from "../../cli/transport";
import { readInstalledVersion } from "../../cli/version";
import { createFakeCli } from "../fixtures/fake-cli";

const mockGetPreferenceValues = vi.mocked(getPreferenceValues);

// A fake CLI that the CLI Path preference points at.
async function installFakeCli(body: string) {
  const cli = await createFakeCli(body);
  mockGetPreferenceValues.mockReturnValue({ cliPath: cli.path } as never);
  return cli;
}

test("rejects malformed JSON from a real CLI process", async () => {
  // Given
  await using cli = await installFakeCli("printf '%s' 'not json'");
  // When
  const result = runCli(["listening-mode", "get"]);
  // Then
  await expect(result).rejects.toMatchObject({
    name: "CliError",
    code: "invalid-response",
  });
});

test("rejects a successful response missing its command-specific state", async () => {
  // Given
  await using cli = await installFakeCli('printf \'%s\' \'{"result":"ok","device":"AirPods"}\'');
  // When
  const result = runCli(["listening-mode", "get"]);
  // Then
  await expect(result).rejects.toMatchObject({
    name: "CliError",
    code: "invalid-response",
  });
});

test("passes the command arguments and JSON flag to a real CLI process", async () => {
  // Given
  await using cli = await installFakeCli(
    'test "$1" = listening-mode\ntest "$2" = set\ntest "$3" = adaptive\ntest "$4" = --json\nprintf \'%s\' \'{"device":"AirPods","listeningMode":"adaptive","result":"ok"}\'',
  );
  // When
  const result = runCli(["listening-mode", "set", "adaptive"]);
  // Then
  await expect(result).resolves.toEqual({
    device: "AirPods",
    listeningMode: "adaptive",
    result: "ok",
  });
});

test("keeps stderr diagnostics while preserving a known error", async () => {
  // Given
  await using cli = await installFakeCli(
    'printf \'%s\' \'{"device":null,"error":"no-device","listeningMode":null,"result":"error"}\'\nprintf \'%s\' \'CLI could not find a connected device\' >&2\nexit 1',
  );
  // When
  const result = runCli(["listening-mode", "get"]);
  // Then
  await expect(result).rejects.toMatchObject({
    code: "no-device",
    diagnostics: {
      kind: "process",
      exitCode: 1,
      signal: null,
      stderr: "CLI could not find a connected device",
    },
  });
});

test("keeps stderr and exit status for an unknown real-process failure", async () => {
  // Given
  await using cli = await installFakeCli("printf '%s' 'CLI failed unexpectedly' >&2\nexit 70");
  // When
  const result = runCli(["listening-mode", "get"]);
  // Then
  await expect(result).rejects.toMatchObject({
    code: "unknown",
    diagnostics: {
      kind: "process",
      exitCode: 70,
      signal: null,
      stderr: "CLI failed unexpectedly",
    },
  });
  await expect(result).rejects.toThrow("CLI failed unexpectedly");
});

test("reports a real process signal separately from the timeout path", async () => {
  // Given
  await using cli = await installFakeCli("kill -TERM $$");
  // When
  const result = runCli(["conversation-awareness", "get"]);
  // Then
  await expect(result).rejects.toBeInstanceOf(CliError);
  await expect(result).rejects.toMatchObject({
    code: "unknown",
    diagnostics: { kind: "killed", signal: "SIGTERM" },
  });
  await expect(result).rejects.toThrow("terminated by SIGTERM");
});

test("reads the installed CLI version from JSON output of a real process", async () => {
  // Given
  await using cli = await createFakeCli(
    'test "$1" = --version\ntest "$2" = --json\nprintf \'%s\' \'{"result":"ok","version":"0.4.0"}\'',
  );
  // When
  const version = await readInstalledVersion(cli.path);
  // Then
  expect(version).toBe("0.4.0");
});

test("reads the installed CLI version from plain --version output of a real process", async () => {
  // Given
  await using cli = await createFakeCli("printf '%s\\n' 'pods-control 0.3.0'");
  // When
  const version = await readInstalledVersion(cli.path);
  // Then
  expect(version).toBe("0.3.0");
});
