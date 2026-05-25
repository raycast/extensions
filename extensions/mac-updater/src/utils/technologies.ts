import { InstalledApp, Source } from "./types";
import { ScanResult } from "./coordinator";

/**
 * What update technologies does this app use? Independent of which one the
 * coordinator picked as primary — an app can use multiple (HandBrake is both
 * Sparkle-enabled AND brew-managed).
 */
export function appUsesTech(app: InstalledApp, tech: Source): boolean {
  switch (tech) {
    case "homebrew-cask":
      return !!app.managedByBrew || !!app.suggestedCask;
    case "mas":
      return !!app.hasAppStoreReceipt || app.knownInstallKind === "mas";
    case "sparkle":
      return !!app.sparkleFeedUrl;
    case "electron":
      return !!app.isElectron;
    case "github":
      // GitHub feeds usually present as a SUFeedURL pointing at github.com
      return (
        !!app.sparkleFeedUrl &&
        /github(?:usercontent)?\.com/i.test(app.sparkleFeedUrl)
      );
    default:
      return false;
  }
}

/** Tally apps per technology. Used to populate the Sources dropdown counts. */
export function computeTechnologyCounts(
  scan: ScanResult,
  adoptableCount: number,
): Record<string, number> {
  const counts: Record<string, number> = {
    "homebrew-cask": 0,
    mas: 0,
    sparkle: 0,
    electron: 0,
    github: 0,
  };
  const allApps: InstalledApp[] = [
    ...scan.apps.map((u) => u.app),
    ...scan.unmanaged,
  ];
  for (const a of allApps) {
    for (const tech of Object.keys(counts) as Source[]) {
      if (appUsesTech(a, tech)) counts[tech]++;
    }
  }
  // Homebrew tally also includes adoption candidates (not yet brew-managed but matched to a cask)
  counts["homebrew-cask"] = Math.max(counts["homebrew-cask"], adoptableCount);
  return counts;
}
