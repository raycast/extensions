import { execFile } from "child_process";
import { expect, vi, type Mock, test } from "vitest";
import {
  compareVersions,
  meetsMinimumVersion,
  normalizeVersion,
  readInstalledVersion,
  resolveVersionStatus,
} from "./version";

vi.mock("child_process", () => ({
  execFile: vi.fn(),
}));

const mockExecFile = execFile as unknown as Mock;

type ExecCallback = (error: Error | null, stdout: string, stderr: string) => void;

function mockExecSequence(results: Array<{ error: Error | null; stdout: string }>) {
  let index = 0;
  mockExecFile.mockImplementation((_file: string, _args: string[], _options: unknown, callback: ExecCallback) => {
    const result = results[index] ?? { error: new Error("unexpected execFile call"), stdout: "" };
    index += 1;
    callback(result.error, result.stdout, "");
  });
}

test("strips a leading v and keeps major.minor.patch", () => {
  // Given
  const tagged = "v0.4.0";
  const padded = " 0.4.0 ";
  // When
  const fromTag = normalizeVersion(tagged);
  const fromPadding = normalizeVersion(padded);
  // Then
  expect(fromTag).toBe("0.4.0");
  expect(fromPadding).toBe("0.4.0");
});

test("rejects versions that are not major.minor.patch", () => {
  // Given
  const incomplete = "0.4";
  const preRelease = "0.4.0-beta";
  const empty = "";
  // When
  const results = [normalizeVersion(incomplete), normalizeVersion(preRelease), normalizeVersion(empty)];
  // Then
  expect(results).toEqual([null, null, null]);
});

test("compares versions numerically rather than lexicographically", () => {
  // Given
  const older = "0.9.0";
  const newer = "0.10.0";
  // When
  const olderToNewer = compareVersions(older, newer);
  const equalTagged = compareVersions("0.4.0", "v0.4.0");
  const newerToOlder = compareVersions(newer, older);
  // Then
  expect(olderToNewer).toBe(-1);
  expect(equalTagged).toBe(0);
  expect(newerToOlder).toBe(1);
});

test("returns null when either compared version cannot be normalized", () => {
  // Given
  const valid = "0.4.0";
  const invalid = "latest";
  // When
  const result = compareVersions(valid, invalid);
  // Then
  expect(result).toBeNull();
});

test.each([
  { name: "equal versions are up to date", installed: "0.4.0", latest: "0.4.0", status: "up-to-date" },
  { name: "an older install needs an update", installed: "0.3.0", latest: "0.4.0", status: "update-available" },
  { name: "a newer install is up to date", installed: "0.5.0", latest: "0.4.0", status: "up-to-date" },
  { name: "a missing installed version is unknown", installed: null, latest: "0.4.0", status: "unknown" },
  { name: "a missing latest release is unknown", installed: "0.4.0", latest: null, status: "unknown" },
  { name: "unusable versions are unknown", installed: "latest", latest: "0.4.0", status: "unknown" },
] as const)("$name", ({ installed, latest, status }) => {
  // Given
  // When
  const result = resolveVersionStatus(installed, latest);
  // Then
  expect(result).toBe(status);
});

test.each([
  { name: "equal to the minimum", installed: "0.4.0", minimum: "v0.4.0", result: true },
  { name: "older than the minimum", installed: "0.3.0", minimum: "0.4.0", result: false },
  { name: "newer than the minimum", installed: "0.5.0", minimum: "0.4.0", result: true },
  { name: "a missing installed version is unknown", installed: null, minimum: "0.4.0", result: null },
  { name: "an unusable installed version is unknown", installed: "latest", minimum: "0.4.0", result: null },
  { name: "an unusable minimum is unknown", installed: "0.4.0", minimum: "latest", result: null },
] as const)("$name", ({ installed, minimum, result }) => {
  // Given
  // When
  const meetsMinimum = meetsMinimumVersion(installed, minimum);
  // Then
  expect(meetsMinimum).toBe(result);
});

test("reads the installed version from JSON output", async () => {
  // Given
  mockExecSequence([{ error: null, stdout: '{"result":"ok","version":"v0.4.0"}' }]);
  // When
  const result = await readInstalledVersion("/opt/homebrew/bin/pods-control");
  // Then
  expect(result).toBe("0.4.0");
  expect(mockExecFile).toHaveBeenCalledTimes(1);
  expect(mockExecFile).toHaveBeenCalledWith(
    "/opt/homebrew/bin/pods-control",
    ["--version", "--json"],
    expect.objectContaining({ timeout: 5000, maxBuffer: 4096 }),
    expect.any(Function),
  );
});

test("falls back to plain --version when JSON output is unusable", async () => {
  // Given
  mockExecSequence([
    { error: null, stdout: '{"result":"ok"}' },
    { error: null, stdout: "pods-control 0.3.1\n" },
  ]);
  // When
  const result = await readInstalledVersion("/usr/local/bin/pods-control");
  // Then
  expect(result).toBe("0.3.1");
  expect(mockExecFile).toHaveBeenNthCalledWith(
    2,
    "/usr/local/bin/pods-control",
    ["--version"],
    expect.anything(),
    expect.any(Function),
  );
});

test("returns null when JSON and plain version commands both fail", async () => {
  // Given
  mockExecSequence([
    { error: new Error("timed out"), stdout: "" },
    { error: null, stdout: "not a version" },
  ]);
  // When
  const result = await readInstalledVersion("/opt/homebrew/bin/pods-control");
  // Then
  expect(result).toBeNull();
});
