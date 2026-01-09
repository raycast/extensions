/**
 * Homebrew utilities module.
 *
 * Re-exports all brew-related utilities.
 */

// Types (re-exported from ../types for convenience)
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
} from "../types";

// Paths
export { brewPrefix, brewPath, brewExecutable } from "./paths";

// Commands
export { execBrew, execBrewEnv } from "./commands";

// Progress tracking
export { execBrewWithProgress, parseBrewOutput, formatBytes } from "./progress";
export type { BrewPhase, BrewProgress, ProgressCallback } from "./progress";

// Fetching
export {
  brewFetchInstalled,
  brewFetchInstalledFast,
  brewFetchOutdated,
  brewUpdate,
  brewFetchFormulae,
  brewFetchCasks,
  brewFetchFormulaInfo,
  brewFetchCaskInfo,
  hasSearchCache,
} from "./fetch";

// Search
export { brewSearch } from "./search";
export type { SearchProgressCallback, SearchDownloadProgress } from "./search";

// Actions
export {
  brewInstall,
  brewInstallWithProgress,
  brewUninstall,
  brewUpgrade,
  brewUpgradeSingleWithProgress,
  brewUpgradeAll,
  brewCleanup,
  brewPinFormula,
  brewUnpinFormula,
  brewDoctor,
} from "./actions";

// Upgrade with progress
export { brewUpgradeWithProgress } from "./upgrade";
export type { UpgradeStep, UpgradeStepStatus, UpgradeProgressCallback, UpgradeResult } from "./upgrade";

// Helpers
export {
  brewName,
  brewIsInstalled,
  brewInstallPath,
  brewFormatVersion,
  brewIdentifier,
  brewCaskOption,
  isCask,
  brewCompare,
  brewInstallCommand,
  brewUninstallCommand,
  brewUpgradeCommand,
} from "./helpers";

// Internal API (experimental)
export { getSystemTag, getInternalFormulaUrl, getInternalCaskUrl, logInternalApiConfig } from "./internal-api";
