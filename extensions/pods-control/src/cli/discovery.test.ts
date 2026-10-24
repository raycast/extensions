import { accessSync, statSync } from "fs";
import { getPreferenceValues } from "@raycast/api";
import { expect, vi, test } from "vitest";
import { findBrewPrefixCli, findCliPath, isCliInstalled } from "./discovery";
import type * as Fs from "fs";

vi.mock("fs", async (importOriginal) => {
  const actual = await importOriginal<typeof Fs>();
  return {
    ...actual,
    accessSync: vi.fn(),
    statSync: vi.fn(),
    constants: { ...actual.constants, X_OK: 1 },
  };
});

const mockAccessSync = vi.mocked(accessSync);

const mockStatSync = vi.mocked(statSync);

const mockGetPreferenceValues = vi.mocked(getPreferenceValues);

// The CLI Path preference is `cliPath`, and only `paths` exist as executables.
function stubMachine({ cliPath, paths = [], isFile = true }: { cliPath?: string; paths?: string[]; isFile?: boolean }) {
  mockGetPreferenceValues.mockReturnValue((cliPath === undefined ? {} : { cliPath }) as never);
  mockStatSync.mockReturnValue({ isFile: () => isFile } as never);
  mockAccessSync.mockImplementation(((path: string) => {
    if (!paths.includes(path)) {
      throw new Error(`ENOENT: ${path}`);
    }
  }) as typeof accessSync);
}

test("returns the Homebrew path when the CLI is there", () => {
  // Given
  stubMachine({ paths: ["/opt/homebrew/bin/pods-control", "/usr/local/bin/pods-control"] });
  // When
  const result = findCliPath();
  // Then
  expect(result).toBe("/opt/homebrew/bin/pods-control");
});

test("falls back to the next search path", () => {
  // Given
  stubMachine({ paths: ["/usr/local/bin/pods-control"] });
  // When
  const result = findCliPath();
  // Then
  expect(result).toBe("/usr/local/bin/pods-control");
});

test("returns null when the CLI is nowhere to be found", () => {
  // Given
  stubMachine({});
  // When
  const result = findCliPath();
  // Then
  expect(result).toBeNull();
});

test("uses the CLI Path preference when set", () => {
  // Given
  stubMachine({ cliPath: "/custom/bin/pods-control", paths: ["/custom/bin/pods-control"] });
  // When
  const result = findCliPath();
  // Then
  expect(result).toBe("/custom/bin/pods-control");
});

test("does not fall back to default paths when the CLI Path preference is invalid", () => {
  // Given
  stubMachine({ cliPath: "/custom/bin/pods-control", paths: ["/opt/homebrew/bin/pods-control"] });
  // When
  const result = findCliPath();
  // Then
  expect(result).toBeNull();
});

test("rejects a CLI Path preference that points at a directory", () => {
  // Given
  stubMachine({ cliPath: "/opt/homebrew/bin", paths: ["/opt/homebrew/bin"], isFile: false });
  // When
  const result = findCliPath();
  // Then
  expect(result).toBeNull();
});

test("ignores a whitespace-only CLI Path preference", () => {
  // Given
  stubMachine({ cliPath: "   ", paths: ["/opt/homebrew/bin/pods-control"] });
  // When
  const result = findCliPath();
  // Then
  expect(result).toBe("/opt/homebrew/bin/pods-control");
});

test("finds the CLI inside a Homebrew keg that no search path exposes", () => {
  // Given
  stubMachine({ paths: ["/opt/homebrew/opt/pods-control/bin/pods-control"] });
  // When
  const result = findBrewPrefixCli("/opt/homebrew/opt/pods-control");
  // Then
  expect(result).toBe("/opt/homebrew/opt/pods-control/bin/pods-control");
  // Then the keg stays out of automatic discovery.
  expect(findCliPath()).toBeNull();
});

test.each([
  { name: "the keg holds no executable", paths: [], isFile: true },
  { name: "the keg path is a directory", paths: ["/opt/homebrew/opt/pods-control/bin/pods-control"], isFile: false },
])("reports no keg CLI when $name", ({ paths, isFile }) => {
  // Given
  stubMachine({ paths, isFile });
  // When
  const result = findBrewPrefixCli("/opt/homebrew/opt/pods-control");
  // Then
  expect(result).toBeNull();
});

test("reports whether the CLI is installed", () => {
  // Given
  stubMachine({});
  // When
  const result = isCliInstalled();
  // Then
  expect(result).toBe(false);
  // When
  stubMachine({ paths: ["/opt/homebrew/bin/pods-control"] });
  const result2 = isCliInstalled();
  // Then
  expect(result2).toBe(true);
});
