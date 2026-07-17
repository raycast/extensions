/**
 * WinGet error codes, messages, and error types.
 *
 * Every constant below is taken from the official winget return-code table
 * (microsoft/winget-cli: doc/windows/package-manager/winget/returnCodes.md,
 * which matches AppInstallerErrors.h). Do not edit this table without
 * re-checking the official source, and keep errors.test.ts's official-pairs
 * fixture in sync.
 *
 * The process exit code is the PRIMARY signal for interpreting an operation
 * (exit codes are locale-independent; winget localizes all prose) — English
 * text patterns only refine messages.
 */

// ---------------------------------------------------------------------------
// HRESULT exit codes (APPINSTALLER_CLI_ERROR_*, facility 0x8A15)
// ---------------------------------------------------------------------------

const COMMAND_FAILED = 0x8a150003;
const CTRL_SIGNAL_RECEIVED = 0x8a150005;
const DOWNLOAD_FAILED = 0x8a150008;
const INSTALLER_HASH_MISMATCH = 0x8a150011;
const NO_APPLICATIONS_FOUND = 0x8a150014;
const COMMAND_REQUIRES_ADMIN = 0x8a150019;
const MSSTORE_INSTALL_FAILED = 0x8a15001e;
const UPDATE_NOT_APPLICABLE = 0x8a15002b;
const NO_UNINSTALL_INFO_FOUND = 0x8a15002f;
const EXEC_UNINSTALL_COMMAND_FAILED = 0x8a150030;
const IMPORT_INSTALL_FAILED = 0x8a150034;
const MSI_INSTALL_FAILED = 0x8a150049;
const PORTABLE_INSTALL_FAILED = 0x8a150052;
const PORTABLE_UNINSTALL_FAILED = 0x8a150057;
const PACKAGE_ALREADY_INSTALLED = 0x8a150061;
const PIN_ALREADY_EXISTS = 0x8a150062;
const PIN_DOES_NOT_EXIST = 0x8a150063;
const MULTIPLE_INSTALL_FAILED = 0x8a150065;
const MULTIPLE_UNINSTALL_FAILED = 0x8a150066;
const UPDATE_INSTALL_TECHNOLOGY_MISMATCH = 0x8a15008e;
const INSTALL_PACKAGE_IN_USE = 0x8a150101;
const INSTALL_INSTALL_IN_PROGRESS = 0x8a150102;
const INSTALL_FILE_IN_USE = 0x8a150103;
const INSTALL_MISSING_DEPENDENCY = 0x8a150104;
const INSTALL_DISK_FULL = 0x8a150105;
const INSTALL_INSUFFICIENT_MEMORY = 0x8a150106;
const INSTALL_NO_NETWORK = 0x8a150107;
const INSTALL_CONTACT_SUPPORT = 0x8a150108;
const INSTALL_REBOOT_REQUIRED_TO_FINISH = 0x8a150109;
const INSTALL_REBOOT_REQUIRED_FOR_INSTALL = 0x8a15010a;
const INSTALL_REBOOT_INITIATED = 0x8a15010b;
const INSTALL_CANCELLED_BY_USER = 0x8a15010c;
const INSTALL_ALREADY_INSTALLED = 0x8a15010d;
const INSTALL_DOWNGRADE = 0x8a15010e;
const INSTALL_BLOCKED_BY_POLICY = 0x8a15010f;
const INSTALL_DEPENDENCIES_FAILED = 0x8a150110;
const INSTALL_PACKAGE_IN_USE_BY_APPLICATION = 0x8a150111;
const INSTALL_SYSTEM_NOT_SUPPORTED = 0x8a150113;
const INSTALL_UPGRADE_NOT_SUPPORTED = 0x8a150114;

// ---------------------------------------------------------------------------
// Exit code classification — drives operation result interpretation
// ---------------------------------------------------------------------------

type ExitCodeKind = "success" | "noop" | "failure" | "cancelled";

interface ExitCodeInfo {
  kind: ExitCodeKind;
  message: string;
}

const EXIT_CODE_INFO: ReadonlyMap<number, ExitCodeInfo> = new Map<number, ExitCodeInfo>([
  // No-ops: nothing changed, and that is fine.
  [PACKAGE_ALREADY_INSTALLED, { kind: "noop", message: "Already installed" }],
  [INSTALL_ALREADY_INSTALLED, { kind: "noop", message: "Another version is already installed" }],
  [UPDATE_NOT_APPLICABLE, { kind: "noop", message: "No applicable update" }],
  [PIN_ALREADY_EXISTS, { kind: "noop", message: "Already pinned" }],
  [PIN_DOES_NOT_EXIST, { kind: "noop", message: "Not pinned" }],
  // The operation completed; the system needs a restart to finish.
  [INSTALL_REBOOT_REQUIRED_TO_FINISH, { kind: "success", message: "Restart your PC to finish" }],
  [INSTALL_REBOOT_INITIATED, { kind: "success", message: "Your PC will restart to finish" }],
  // Declined/aborted on the winget side. Deliberately NOT kind "cancelled":
  // `cancelled` is reserved for OUR AbortSignal, which never reaches exit-code
  // interpretation (the kill rejects with CancelledError first). These codes
  // mean the user declined a UAC prompt or pressed the installer's own cancel —
  // a per-package failure. Conflating them with caller cancellation would make
  // bulk upgrades silently skip the remaining packages and report success.
  [CTRL_SIGNAL_RECEIVED, { kind: "failure", message: "Cancelled on the winget side" }],
  [INSTALL_CANCELLED_BY_USER, { kind: "failure", message: "Cancelled in the installer or UAC prompt" }],
  // Failures.
  [COMMAND_FAILED, { kind: "failure", message: "Command failed" }],
  [DOWNLOAD_FAILED, { kind: "failure", message: "Download failed" }],
  [INSTALLER_HASH_MISMATCH, { kind: "failure", message: "Installer hash mismatch" }],
  [NO_APPLICATIONS_FOUND, { kind: "failure", message: "Package not found" }],
  [
    COMMAND_REQUIRES_ADMIN,
    {
      kind: "failure",
      message: "Requires administrator, retry from an elevated terminal",
    },
  ],
  [MSSTORE_INSTALL_FAILED, { kind: "failure", message: "Microsoft Store install failed" }],
  [NO_UNINSTALL_INFO_FOUND, { kind: "failure", message: "Uninstaller not found" }],
  [EXEC_UNINSTALL_COMMAND_FAILED, { kind: "failure", message: "Uninstall command failed" }],
  [IMPORT_INSTALL_FAILED, { kind: "failure", message: "Some imported packages failed to install" }],
  [MSI_INSTALL_FAILED, { kind: "failure", message: "MSI install failed" }],
  [PORTABLE_INSTALL_FAILED, { kind: "failure", message: "Portable install failed" }],
  [PORTABLE_UNINSTALL_FAILED, { kind: "failure", message: "Portable uninstall failed" }],
  [MULTIPLE_INSTALL_FAILED, { kind: "failure", message: "One or more packages failed to install" }],
  [MULTIPLE_UNINSTALL_FAILED, { kind: "failure", message: "One or more packages failed to uninstall" }],
  [UPDATE_INSTALL_TECHNOLOGY_MISMATCH, { kind: "failure", message: "Installer type changed, uninstall first" }],
  [INSTALL_PACKAGE_IN_USE, { kind: "failure", message: "App in use, close it first" }],
  [INSTALL_INSTALL_IN_PROGRESS, { kind: "failure", message: "Another install in progress, try later" }],
  [INSTALL_FILE_IN_USE, { kind: "failure", message: "Files in use, close apps using them" }],
  [INSTALL_MISSING_DEPENDENCY, { kind: "failure", message: "Missing dependency" }],
  [INSTALL_DISK_FULL, { kind: "failure", message: "Disk full" }],
  [INSTALL_INSUFFICIENT_MEMORY, { kind: "failure", message: "Out of memory" }],
  [INSTALL_NO_NETWORK, { kind: "failure", message: "No internet connection" }],
  [INSTALL_CONTACT_SUPPORT, { kind: "failure", message: "Installer error, contact app support" }],
  [INSTALL_REBOOT_REQUIRED_FOR_INSTALL, { kind: "failure", message: "Restart your PC, then try again" }],
  [INSTALL_DOWNGRADE, { kind: "failure", message: "A newer version is already installed" }],
  [INSTALL_BLOCKED_BY_POLICY, { kind: "failure", message: "Blocked by org policy" }],
  [INSTALL_DEPENDENCIES_FAILED, { kind: "failure", message: "Failed to install dependencies" }],
  [INSTALL_PACKAGE_IN_USE_BY_APPLICATION, { kind: "failure", message: "App in use by another application" }],
  [INSTALL_SYSTEM_NOT_SUPPORTED, { kind: "failure", message: "Package not supported on this system" }],
  [INSTALL_UPGRADE_NOT_SUPPORTED, { kind: "failure", message: "Installer can't upgrade, uninstall first" }],
]);

/** Convert a signed 32-bit exit code to unsigned HRESULT for map lookups. */
function toUnsignedHResult(exitCode: number): number {
  return exitCode < 0 ? exitCode >>> 0 : exitCode;
}

function getExitCodeInfo(exitCode: number): ExitCodeInfo | undefined {
  return EXIT_CODE_INFO.get(toUnsignedHResult(exitCode));
}

function getExitCodeMessage(exitCode: number): string | undefined {
  return getExitCodeInfo(exitCode)?.message;
}

// ---------------------------------------------------------------------------
// Error types
// ---------------------------------------------------------------------------

/** Thrown when the no-output watchdog kills a stuck operation. */
class StaleProcessError extends Error {
  constructor(message = "Process appears stuck") {
    super(message);
    this.name = "StaleProcessError";
  }
}

/** Thrown if and only if the operation was aborted via its AbortSignal. */
class CancelledError extends Error {
  constructor(message = "Operation was cancelled") {
    super(message);
    this.name = "CancelledError";
  }
}

/** winget.exe could not be spawned (not installed, or PATH captured before install). */
class WingetNotFoundError extends Error {
  constructor(executable: string) {
    super(
      executable === "winget"
        ? "winget was not found. Install 'App Installer' from the Microsoft Store, then restart Raycast."
        : `winget was not found at "${executable}". Fix the WinGet Path preference.`,
    );
    this.name = "WingetNotFoundError";
  }
}

export {
  CancelledError,
  COMMAND_FAILED,
  COMMAND_REQUIRES_ADMIN,
  CTRL_SIGNAL_RECEIVED,
  DOWNLOAD_FAILED,
  EXEC_UNINSTALL_COMMAND_FAILED,
  getExitCodeInfo,
  getExitCodeMessage,
  IMPORT_INSTALL_FAILED,
  INSTALL_ALREADY_INSTALLED,
  INSTALL_BLOCKED_BY_POLICY,
  INSTALL_CANCELLED_BY_USER,
  INSTALL_CONTACT_SUPPORT,
  INSTALL_DEPENDENCIES_FAILED,
  INSTALL_DISK_FULL,
  INSTALL_DOWNGRADE,
  INSTALL_FILE_IN_USE,
  INSTALL_INSTALL_IN_PROGRESS,
  INSTALL_INSUFFICIENT_MEMORY,
  INSTALL_MISSING_DEPENDENCY,
  INSTALL_NO_NETWORK,
  INSTALL_PACKAGE_IN_USE,
  INSTALL_PACKAGE_IN_USE_BY_APPLICATION,
  INSTALL_REBOOT_INITIATED,
  INSTALL_REBOOT_REQUIRED_FOR_INSTALL,
  INSTALL_REBOOT_REQUIRED_TO_FINISH,
  INSTALL_SYSTEM_NOT_SUPPORTED,
  INSTALL_UPGRADE_NOT_SUPPORTED,
  INSTALLER_HASH_MISMATCH,
  MSI_INSTALL_FAILED,
  MSSTORE_INSTALL_FAILED,
  MULTIPLE_INSTALL_FAILED,
  MULTIPLE_UNINSTALL_FAILED,
  NO_APPLICATIONS_FOUND,
  NO_UNINSTALL_INFO_FOUND,
  PACKAGE_ALREADY_INSTALLED,
  PIN_ALREADY_EXISTS,
  PIN_DOES_NOT_EXIST,
  PORTABLE_INSTALL_FAILED,
  PORTABLE_UNINSTALL_FAILED,
  StaleProcessError,
  toUnsignedHResult,
  UPDATE_NOT_APPLICABLE,
  UPDATE_INSTALL_TECHNOLOGY_MISMATCH,
  WingetNotFoundError,
  type ExitCodeInfo,
  type ExitCodeKind,
};
