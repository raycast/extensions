import { describe, expect, it } from "vitest";

import {
  isElevationFailure,
  isInstallerBusyFailure,
  isModifiedPortableFailure,
  remapUpgradeNotFound,
} from "./commands";

describe("remapUpgradeNotFound", () => {
  it("remaps NO_APPLICATIONS_FOUND to a no-op for upgrades (source-filter quirk)", () => {
    // winget 1.28 with --source: up-to-date package exits 0x8A150014 with
    // "No installed package found matching input criteria".
    const result = remapUpgradeNotFound({
      success: false,
      message: "Package not found",
      exitCode: -1978335212, // 0x8A150014 signed
      errorCode: "0x8A150014",
    });
    expect(result).toMatchObject({
      success: true,
      noop: true,
      message: "No applicable update",
    });
  });

  it("leaves other failures untouched", () => {
    const failure = {
      success: false,
      message: "Disk full",
      exitCode: -1978334971,
    };
    expect(remapUpgradeNotFound(failure)).toBe(failure);
  });

  it("leaves cancellations untouched", () => {
    const cancelled = {
      success: false,
      cancelled: true,
      exitCode: -1978335212,
    };
    expect(remapUpgradeNotFound(cancelled)).toBe(cancelled);
  });

  it("leaves successes untouched", () => {
    const ok = { success: true, exitCode: 0 };
    expect(remapUpgradeNotFound(ok)).toBe(ok);
  });
});

describe("isElevationFailure", () => {
  it("matches the COMMAND_REQUIRES_ADMIN exit code", () => {
    expect(
      isElevationFailure({
        success: false,
        exitCode: -1978335207, // 0x8A150019 signed
        message: "WinGet exited with code 0x8A150019",
      }),
    ).toBe(true);
  });

  it("matches the curated requires-administrator message", () => {
    expect(
      isElevationFailure({
        success: false,
        exitCode: 1,
        message: "Requires administrator. Installer log: C:\\log.txt",
      }),
    ).toBe(true);
  });

  it("matches installer exit code 740 (ERROR_ELEVATION_REQUIRED)", () => {
    expect(
      isElevationFailure({
        success: false,
        message: "Installer failed with exit code: 740",
      }),
    ).toBe(true);
    // 740 must be a whole number, not a prefix of another exit code.
    expect(
      isElevationFailure({
        success: false,
        message: "Installer failed with exit code: 7400",
      }),
    ).toBe(false);
  });

  it("matches the machine-scope MSIX error 0x80073D28 as exit code and in messages", () => {
    expect(
      isElevationFailure({
        success: false,
        exitCode: -2147009240, // 0x80073D28 signed
        message: "Localized message on non-English Windows",
      }),
    ).toBe(true);
    expect(
      isElevationFailure({
        success: false,
        exitCode: 1,
        message: "Installer failed with exit code 0x80073D28",
      }),
    ).toBe(true);
    // Must be the whole code, not a prefix of a longer one.
    expect(
      isElevationFailure({
        success: false,
        message: "Installer failed with exit code 0x80073D280",
      }),
    ).toBe(false);
  });

  it("does not match the run-unelevated failure (opposite direction)", () => {
    expect(
      isElevationFailure({
        success: false,
        message: "Cannot run as admin, run Raycast unelevated",
      }),
    ).toBe(false);
  });

  it("does not match access-denied or incidental 'administrator' content", () => {
    expect(isElevationFailure({ success: false, message: "Access denied" })).toBe(false);
    expect(
      isElevationFailure({
        success: false,
        message: "Disk full. Installer log: C:\\Users\\Administrator\\AppData\\log.txt",
      }),
    ).toBe(false);
  });

  it("ignores successes, no-ops, and cancellations", () => {
    expect(isElevationFailure({ success: true })).toBe(false);
    expect(
      isElevationFailure({
        success: false,
        cancelled: true,
        message: "Requires administrator",
      }),
    ).toBe(false);
    expect(isElevationFailure({ success: false, message: "Disk full" })).toBe(false);
  });
});

describe("isInstallerBusyFailure", () => {
  it("matches installer exit code 1618 (ERROR_INSTALL_ALREADY_RUNNING)", () => {
    expect(
      isInstallerBusyFailure({
        success: false,
        exitCode: 1,
        errorCode: "1618",
        message: "Another installation is already in progress, retry later",
      }),
    ).toBe(true);
  });

  it("ignores successes, cancellations, and other codes", () => {
    expect(isInstallerBusyFailure({ success: true, errorCode: "1618" })).toBe(false);
    expect(isInstallerBusyFailure({ success: false, cancelled: true, errorCode: "1618" })).toBe(false);
    expect(isInstallerBusyFailure({ success: false, errorCode: "1603" })).toBe(false);
    expect(isInstallerBusyFailure({ success: false, message: "Disk full" })).toBe(false);
  });
});

describe("isModifiedPortableFailure", () => {
  it("matches the PORTABLE_UNINSTALL_FAILED exit code (locale-independent)", () => {
    expect(
      isModifiedPortableFailure({
        success: false,
        exitCode: -1978335145, // 0x8A150057 signed
        message: "Localized message on non-English Windows",
      }),
    ).toBe(true);
  });

  it("matches the curated modified-portable message", () => {
    expect(
      isModifiedPortableFailure({
        success: false,
        message: "Portable package was modified since install",
      }),
    ).toBe(true);
  });

  it("matches the raw winget wording", () => {
    expect(
      isModifiedPortableFailure({
        success: false,
        message: "Unable to remove Portable package as it has been modified; to override this check use --force",
      }),
    ).toBe(true);
  });

  it("ignores successes, cancellations, and unrelated failures", () => {
    expect(
      isModifiedPortableFailure({
        success: true,
        message: "Portable package was modified since install",
      }),
    ).toBe(false);
    expect(
      isModifiedPortableFailure({
        success: false,
        cancelled: true,
        message: "Portable package was modified since install",
      }),
    ).toBe(false);
    expect(isModifiedPortableFailure({ success: false, message: "Disk full" })).toBe(false);
  });
});
