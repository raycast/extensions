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
  CaskArtifact,
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
  brewMapInstalled,
  asInstallableResults,
  brewFetchOutdated,
  brewFetchVulns,
  brewUpdate,
  brewCheckForUpdate,
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
  brewInstallDryRun,
  brewInstallWithProgress,
  brewUninstall,
  brewUpgrade,
  brewUpgradeSingleWithProgress,
  brewUpgradeAll,
  brewCleanup,
  brewPin,
  brewUnpin,
  brewDoctor,
} from "./actions";

// Link / unlink casks (`brew {link,unlink} --cask`, Homebrew 7)
export { brewCaskLinkPreview, caskHasSymlinkArtifacts } from "./link";
export type { CaskLinkVerb } from "./link";

// Install preview (`brew install --dry-run`)
export { parseDryRun } from "./dry-run";
export type { DryRunSection } from "./dry-run";

// Doctor (`brew doctor --json`)
export { tierLabel, worstTier, doctorReportMarkdown } from "./doctor";
export type { DoctorReport, DoctorTier } from "./doctor";

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

// Installability (Homebrew 7's ⊘ marker, derived from the API JSON)
export { installabilityOf } from "./installability";
export { brewHost } from "./host";

// Version comparison
export { isOutdatedVersion, HOMEBREW_7 } from "./version";
export { getBrewMajorVersion, invalidateBrewMajorVersion } from "./brew-version";
export { confirmAndRun } from "./confirmAndRun";

// Vulnerabilities (`brew vulns`)
export { osvUrl, osvLink, escapeMarkdown } from "./vulns";
export type { VulnSeverity, Vulnerability, VulnFinding, VulnResults } from "./vulns";

// Helpers
export {
  brewName,
  brewIsInstalled,
  brewInstallPath,
  brewFormatVersion,
  brewInstalledVersion,
  brewAvailableVersion,
  formatPackageVersion,
  brewIsOutdated,
  brewInstalledDate,
  brewIdentifier,
  brewCaskOption,
  caskLanguagesText,
  normalizeOutdatedResults,
  brewPinnedIdentifiers,
  pinLookupKey,
  isPinnedPackage,
  isCask,
  brewCompare,
  brewInstallCommand,
  brewAdoptCommand,
  brewUninstallCommand,
  brewUpgradeCommand,
} from "./helpers";
