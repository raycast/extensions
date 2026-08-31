import { describe, expect, it } from "vitest";

import {
  ensureTableQuerySucceeded,
  isElevationFailure,
  isInstallerBusyFailure,
  isModifiedPortableFailure,
  isRetryableFailure,
  remapUninstallNotFound,
  remapUpgradeNotFound,
} from "./commands";

describe("isRetryableFailure", () => {
  it("classifies environment and user-choice failures as retryable", () => {
    // Caller cancellation, UAC decline, busy installer mutex, app in use
    // (log-detected message), winget busy/env codes.
    expect(isRetryableFailure({ success: false, cancelled: true })).toBe(true);
    expect(isRetryableFailure({ success: false, exitCode: 1223, message: "Cancelled in the UAC prompt" })).toBe(true);
    expect(isRetryableFailure({ success: false, errorCode: "1618" })).toBe(true);
    expect(isRetryableFailure({ success: false, message: "App in use, close it first" })).toBe(true);
    expect(isRetryableFailure({ success: false, exitCode: -1978334975 /* INSTALL_PACKAGE_IN_USE */ })).toBe(true);
    expect(isRetryableFailure({ success: false, exitCode: -1978334969 /* INSTALL_NO_NETWORK */ })).toBe(true);
  });

  it("classifies installer-tied failures as non-retryable", () => {
    // Unknown vendor installer exit code (e.g. an installer crash).
    expect(isRetryableFailure({ success: false, message: "Installer failed with exit code 3221225477" })).toBe(false);
    // Installer technology mismatch — deterministic for the offered version.
    expect(isRetryableFailure({ success: false, exitCode: -1978335090 /* TECHNOLOGY_MISMATCH */ })).toBe(false);
    // OS-level launch failure of a broken registered uninstaller.
    expect(isRetryableFailure({ success: false, message: "Application not found", errorCode: "0x800401F5" })).toBe(
      false,
    );
  });
});

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

describe("remapUninstallNotFound", () => {
  it("remaps NO_APPLICATIONS_FOUND to a no-op (ghost index row self-heals)", () => {
    const result = remapUninstallNotFound({
      success: false,
      message: "Package not found",
      exitCode: -1978335212, // 0x8A150014 signed
      errorCode: "0x8A150014",
    });
    expect(result).toMatchObject({
      success: true,
      noop: true,
      message: "Not installed",
    });
  });

  it("leaves genuine failures and cancellations untouched", () => {
    const failure = { success: false, message: "Access denied", exitCode: 5 };
    expect(remapUninstallNotFound(failure)).toBe(failure);
    const cancelled = { success: false, cancelled: true, exitCode: -1978335212 };
    expect(remapUninstallNotFound(cancelled)).toBe(cancelled);
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

describe("ensureTableQuerySucceeded", () => {
  const emptyParse = { items: [], stats: { droppedTruncatedIds: 0 } };
  const oneRowParse = { items: [{ id: "Foo.Bar" }], stats: { droppedTruncatedIds: 0 } };
  const run = (exitCode: number, stdout = "") => ({ stdout, stderr: "", exitCode });

  it("throws on a zero-row parse with a failure exit code", () => {
    // Observed live: `winget list` crashed with 0x80071130 ("Fast Cache data
    // not found") after a source package update; the empty output must not
    // be committed as "nothing installed".
    expect(() => ensureTableQuerySucceeded(run(-2147020496), emptyParse, "Failed to list installed packages")).toThrow(
      "Failed to list installed packages",
    ); // 0x80071130 signed
  });

  it("uses the curated exit-code message when one exists", () => {
    expect(() => ensureTableQuerySucceeded(run(-1978335207), emptyParse, "fallback")).toThrow(
      "Requires administrator, retry from an elevated terminal",
    );
  });

  it("accepts an empty table when the query exits 0", () => {
    expect(ensureTableQuerySucceeded(run(0), emptyParse, "fallback")).toBe(emptyParse);
  });

  it("accepts NO_APPLICATIONS_FOUND as a genuinely empty table", () => {
    expect(ensureTableQuerySucceeded(run(-1978335212), emptyParse, "fallback")).toBe(emptyParse); // 0x8A150014 signed
  });

  it("prefers parsed rows over a failure exit code", () => {
    expect(ensureTableQuerySucceeded(run(-2147020496), oneRowParse, "fallback")).toBe(oneRowParse);
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
