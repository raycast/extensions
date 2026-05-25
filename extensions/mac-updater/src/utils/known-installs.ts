/**
 * Curated install instructions for apps that aren't in the main Homebrew cask repo
 * (live in third-party taps) or that only live on the Mac App Store but lack a local
 * receipt for whatever reason. Keyed by CFBundleIdentifier.
 */

import { getCachedUserKnownInstall } from "./user-known-installs";

// Re-export types from the shared module so existing imports keep working.
export type { KnownInstall, KnownInstallKind } from "./known-install-types";
import type { KnownInstall } from "./known-install-types";

export const KNOWN_INSTALLS: Record<string, KnownInstall> = {
  // KDE Connect — third-party Homebrew tap (kde-mac/kde)
  // The cask points at a CDN URL that 404s when the tap maintainers haven't
  // refreshed it. As of this writing the tap is broken — `disabled` flips us to
  // open-the-homepage mode so we don't waste cycles trying to install. Flip back
  // to false if you want to retry in case upstream got fixed.
  "org.kde.kdeconnect": {
    kind: "brew-tap",
    description: "KDE Connect (manual install)",
    caskToken: "kde-mac/kde/kdeconnect",
    homepageUrl: "https://kdeconnect.kde.org/download.html",
    disabled: true,
    disabledReason:
      "The KDE-Mac tap's cask currently points at a CDN URL that returns 404. The tap maintainers need to refresh it. Download from the official KDE Connect page instead.",
    commands: [
      "/opt/homebrew/bin/brew tap kde-mac/kde https://invent.kde.org/packaging/homebrew-kde.git",
      "/opt/homebrew/bin/brew update --quiet",
      "/opt/homebrew/bin/brew install --cask --force kde-mac/kde/kdeconnect",
    ],
  },

  // Blackmagic Design — App Store apps (verified MAS IDs)
  "com.blackmagic-design.DiskSpeedTest": {
    kind: "mas",
    description: "Mac App Store",
    masId: 425264550,
    commands: ["/opt/homebrew/bin/mas install 425264550"],
  },
  // The bundle ID for the standalone "Blackmagic RAW Speed Test" .app on disk
  // is com.blackmagic-design.RAWSpeedTest; the MAS app ID is 1466185689.
  "com.blackmagic-design.RAWSpeedTest": {
    kind: "mas",
    description: "Mac App Store",
    masId: 1466185689,
    commands: ["/opt/homebrew/bin/mas install 1466185689"],
  },
  // NOTE: Blackmagic Proxy Generator's MAS ID is unverified. Removed from the
  // registry so the app falls through to the unmanaged flow, where the user can
  // use "Search Mac App Store…" (App Store search) or "Adopt With Custom Cask…"
  // to map the right install themselves.
};

export function getKnownInstall(bundleId: string): KnownInstall | undefined {
  // Curated registry first, then user-defined mappings (loaded into the
  // in-memory cache by the scanner via refreshUserKnownInstallsCache).
  return KNOWN_INSTALLS[bundleId] ?? getCachedUserKnownInstall(bundleId);
}
