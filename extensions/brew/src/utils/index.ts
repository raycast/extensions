/**
 * Utilities module.
 *
 * Re-exports all utility functions and types.
 */

// Types
export type {
  ExecError,
  ExecResult,
  Nameable,
  Cask,
  CaskDependency,
  Formula,
  InstalledVersion,
  Versions,
  OutdatedFormula,
  OutdatedCask,
  InstallableResults,
  OutdatedResults,
  InstalledMap,
  Remote,
} from "./types";

// Preferences
export { preferences } from "./preferences";

// Logger
export { logger, brewLogger, cacheLogger, actionsLogger, fetchLogger, searchLogger, uiLogger } from "./logger";

// Errors
export {
  BrewError,
  NetworkError,
  ParseError,
  BrewCommandError,
  BrewNotFoundError,
  CacheError,
  BrewLockError,
  PackageNotFoundError,
  PackageDisabledError,
  PackageConflictError,
  UnsupportedMacOSError,
  isBrewError,
  isNetworkError,
  isBrewLockError,
  isPackageDisabledError,
  isPackageConflictError,
  isUnsupportedMacOSError,
  isRecoverableError,
  getErrorMessage,
  isBrewLockMessage,
  isDisabledPackageMessage,
  parseDisabledPackageMessage,
  isConflictMessage,
  isMacOSVersionMessage,
} from "./errors";

// Cache
export { supportPath, bundleIdentifier, cachePath, fetchRemote } from "./cache";

// Toast
export { showActionToast, showFailureToast } from "./toast";
export type { ActionToastHandle } from "./toast";

// Array extensions (side-effect import to add prototype methods)
import "./array";

// Async utilities
export { wait } from "./async";

// Text utilities
export { pluralize, formatCount } from "./text";

// Brew utilities
export * from "./brew";

// Re-export upgrade types for convenience
export type { UpgradeStep, UpgradeStepStatus, UpgradeProgressCallback, UpgradeResult } from "./brew/upgrade";

// Re-export progress types for convenience
export type { BrewPhase, BrewProgress, ProgressCallback } from "./brew/progress";
