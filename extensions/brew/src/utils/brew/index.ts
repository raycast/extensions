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
} from "../types";

// Paths
export { brewPrefix, brewPath, brewCachePrefix, brewExecutable } from "./paths";

// Commands
export { execBrew, execBrewEnv } from "./commands";

// Progress tracking
export { execBrewWithProgress, parseBrewOutput, formatBytes } from "./progress";
export type { BrewPhase, BrewProgress, ProgressCallback } from "./progress";

// Fetching
export {
  brewFetchInstalled,
  brewFetchInstallableResults,
  brewFetchInstalledFast,
  brewMapInstalled,
  asInstallableResults,
  brewFetchOutdated,
  brewUpdate,
  brewFetchFormulaInfo,
  brewFetchCaskInfo,
  hasSearchCache,
  invalidateChunkedCacheMemory,
  onIndexRefreshed,
} from "./fetch";

// Analytics
export {
  packageAnalyticsURL,
  analyticsRows,
  totalForPeriod,
  packageStatus,
  fetchPopularityRanks,
  invalidatePopularityRanks,
  analyticsCacheFiles,
  POPULARITY_PERIOD,
} from "./analytics";
export type {
  AnalyticsPeriod,
  AnalyticsRow,
  AnalyticsCounts,
  PackageAnalytics,
  PackageDetailResponse,
  PopularityRanks,
} from "./analytics";

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
export { brewUpgradeOutdated, upgradeKey } from "./upgrade";
export type {
  UpgradePackage,
  UpgradePackageStatus,
  UpgradeEvent,
  UpgradeEventCallback,
  UpgradeSummary,
} from "./upgrade";

// Services
export {
  ALL_SERVICES,
  SERVICE_ACTION_COPY,
  applyServiceAction,
  brewFetchServices,
  brewStartService,
  brewStopService,
  brewRestartService,
  brewServiceIsRunning,
  runServiceCommand,
} from "./services";
export type { Service, ServiceStatus, ServiceAction } from "./services";

// Version comparison
export { isOutdatedVersion } from "./version";

// Helpers
export {
  brewName,
  brewIsInstalled,
  brewInstallPath,
  brewFormatVersion,
  brewInstalledVersion,
  brewIsOutdated,
  brewInstalledDate,
  brewIdentifier,
  brewCaskOption,
  isCask,
  brewCompare,
  brewInstallCommand,
  brewAdoptCommand,
  brewUninstallCommand,
  brewUpgradeCommand,
} from "./helpers";
