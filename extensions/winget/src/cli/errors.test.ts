import { describe, expect, it } from "vitest";

import * as errors from "./errors";
import { getExitCodeInfo, getExitCodeMessage, StaleProcessError, toUnsignedHResult } from "./errors";

describe("StaleProcessError", () => {
  it("has correct name and message", () => {
    const err = new StaleProcessError("no output for 5 minutes");
    expect(err.name).toBe("StaleProcessError");
    expect(err.message).toBe("no output for 5 minutes");
    expect(err).toBeInstanceOf(Error);
  });
});

describe("toUnsignedHResult", () => {
  it("converts signed 32-bit exit codes to unsigned HRESULTs", () => {
    expect(toUnsignedHResult(-1978335135)).toBe(0x8a150061);
    expect(toUnsignedHResult(0x8a150061)).toBe(0x8a150061);
    expect(toUnsignedHResult(0)).toBe(0);
  });
});

describe("official winget return-code table", () => {
  /**
   * Symbol/value pairs copied verbatim from microsoft/winget-cli
   * doc/windows/package-manager/winget/returnCodes.md (matches
   * AppInstallerErrors.h). The fixture pins the constants to the official
   * source rather than to this codebase's own definitions; 11 of the previous
   * implementation's 17 constants did not match the official values.
   */
  const OFFICIAL: Array<[keyof typeof errors & string, number]> = [
    ["COMMAND_FAILED", 0x8a150003],
    ["CTRL_SIGNAL_RECEIVED", 0x8a150005],
    ["DOWNLOAD_FAILED", 0x8a150008],
    ["INSTALLER_HASH_MISMATCH", 0x8a150011],
    ["NO_APPLICATIONS_FOUND", 0x8a150014],
    ["COMMAND_REQUIRES_ADMIN", 0x8a150019],
    ["MSSTORE_INSTALL_FAILED", 0x8a15001e],
    ["UPDATE_NOT_APPLICABLE", 0x8a15002b],
    ["NO_UNINSTALL_INFO_FOUND", 0x8a15002f],
    ["EXEC_UNINSTALL_COMMAND_FAILED", 0x8a150030],
    ["IMPORT_INSTALL_FAILED", 0x8a150034],
    ["MSI_INSTALL_FAILED", 0x8a150049],
    ["PORTABLE_INSTALL_FAILED", 0x8a150052],
    ["PORTABLE_UNINSTALL_FAILED", 0x8a150057],
    ["PACKAGE_ALREADY_INSTALLED", 0x8a150061],
    ["PIN_ALREADY_EXISTS", 0x8a150062],
    ["PIN_DOES_NOT_EXIST", 0x8a150063],
    ["MULTIPLE_INSTALL_FAILED", 0x8a150065],
    ["MULTIPLE_UNINSTALL_FAILED", 0x8a150066],
    ["UPDATE_INSTALL_TECHNOLOGY_MISMATCH", 0x8a15008e],
    ["INSTALL_PACKAGE_IN_USE", 0x8a150101],
    ["INSTALL_INSTALL_IN_PROGRESS", 0x8a150102],
    ["INSTALL_FILE_IN_USE", 0x8a150103],
    ["INSTALL_MISSING_DEPENDENCY", 0x8a150104],
    ["INSTALL_DISK_FULL", 0x8a150105],
    ["INSTALL_INSUFFICIENT_MEMORY", 0x8a150106],
    ["INSTALL_NO_NETWORK", 0x8a150107],
    ["INSTALL_CONTACT_SUPPORT", 0x8a150108],
    ["INSTALL_REBOOT_REQUIRED_TO_FINISH", 0x8a150109],
    ["INSTALL_REBOOT_REQUIRED_FOR_INSTALL", 0x8a15010a],
    ["INSTALL_REBOOT_INITIATED", 0x8a15010b],
    ["INSTALL_CANCELLED_BY_USER", 0x8a15010c],
    ["INSTALL_ALREADY_INSTALLED", 0x8a15010d],
    ["INSTALL_DOWNGRADE", 0x8a15010e],
    ["INSTALL_BLOCKED_BY_POLICY", 0x8a15010f],
    ["INSTALL_DEPENDENCIES_FAILED", 0x8a150110],
    ["INSTALL_PACKAGE_IN_USE_BY_APPLICATION", 0x8a150111],
    ["INSTALL_SYSTEM_NOT_SUPPORTED", 0x8a150113],
    ["INSTALL_UPGRADE_NOT_SUPPORTED", 0x8a150114],
  ];

  it.each(OFFICIAL)("%s matches the official value", (symbol, officialValue) => {
    expect(errors[symbol]).toBe(officialValue);
  });
});

describe("exit code classification", () => {
  it("classifies no-ops (signed and unsigned forms)", () => {
    expect(getExitCodeInfo(0x8a150061)?.kind).toBe("noop"); // already installed
    expect(getExitCodeInfo(-1978335189)?.kind).toBe("noop"); // UPDATE_NOT_APPLICABLE signed
    expect(getExitCodeInfo(0x8a150062)?.kind).toBe("noop"); // pin already exists
  });

  it("classifies the real-world file-in-use signed exit code correctly", () => {
    // -1978334973 = 0x8A150103 = INSTALL_FILE_IN_USE — the previous
    // implementation diagnosed this as "Another install in progress".
    const info = getExitCodeInfo(-1978334973);
    expect(info?.kind).toBe("failure");
    expect(info?.message).toBe("Files in use, close apps using them");
  });

  it("classifies winget-side cancellations as failures, never as caller cancellation", () => {
    // `cancelled` is reserved for our AbortSignal (CancelledError path); a
    // declined UAC prompt / installer-cancel must fail the package so bulk
    // operations continue and the package is reported as failed.
    expect(getExitCodeInfo(0x8a150005)?.kind).toBe("failure");
    expect(getExitCodeInfo(0x8a15010c)?.kind).toBe("failure");
  });

  it("classifies reboot-to-finish as success", () => {
    expect(getExitCodeInfo(0x8a150109)?.kind).toBe("success");
  });

  it("returns undefined for unknown codes", () => {
    expect(getExitCodeMessage(0x8a15ffff)).toBeUndefined();
    expect(getExitCodeMessage(12345)).toBeUndefined();
  });
});
