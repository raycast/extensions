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
  // KDE Connect — third-party Homebrew tap (kde-mac/kde).
  //
  // KDE doesn't ship an official Mac build of KDE Connect; the community
  // kde-mac tap packages nightly builds from KDE's Binary Factory. This is
  // an opt-in path — the adoption confirmation dialog already labels it as a
  // third-party tap, so users see what they're agreeing to before install.
  //
  // The tap had a CDN-404 issue in the past; it's been actively maintained
  // since (see https://invent.kde.org/packaging/homebrew-kde). If install
  // breaks again, flip `disabled: true` and add a `disabledReason`.
  //
  // The do-caveats.sh script is recommended by the tap's README — it fixes
  // symlinks left over from their in-progress migration to homebrew/core.
  "org.kde.kdeconnect": {
    kind: "brew-tap",
    description: "KDE Connect (nightly via kde-mac tap)",
    caskToken: "kde-mac/kde/kdeconnect",
    homepageUrl: "https://kdeconnect.kde.org/download.html",
    // Heads up to anyone updating these commands:
    // - --force-auto-update on `brew tap` is rejected by older brew releases
    //   (4.4 and below). Leave it off — the tap still works, it just won't
    //   pre-fetch updates on every `brew update`.
    // - kde-mac's casks pin a specific nightly build number from KDE's
    //   Binary Factory. Those builds get pruned on a rolling basis, so the
    //   download URL routinely 404s for a few days at a time. When that
    //   happens, humanizeInstallError() catches the curl 56 / 404 pattern
    //   and the failure toast offers "Open Project Homepage" so the user
    //   can grab the .dmg directly from kdeconnect.kde.org instead.
    commands: [
      "/opt/homebrew/bin/brew tap kde-mac/kde https://invent.kde.org/packaging/homebrew-kde.git",
      "/opt/homebrew/bin/brew update --quiet",
      // Fixes linking after the homebrew/core migration. Safe to re-run.
      '"$(/opt/homebrew/bin/brew --repo kde-mac/kde)/tools/do-caveats.sh" || true',
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
