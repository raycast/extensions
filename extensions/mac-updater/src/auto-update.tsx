import { getPreferenceValues, showHUD } from "@raycast/api";
import { runShell } from "./utils/shell";
import { findMas, isMasInstalled } from "./utils/sources/mas";
import {
  brewUpdateIndex,
  upgradeAllFormulae,
  upgradeCask,
} from "./utils/sources/homebrew";
import { scanAll } from "./utils/coordinator";
import { saveScanCache } from "./utils/scan-cache";
import { recordHistory } from "./utils/update-history";

/**
 * Scheduled background command. Raycast runs this every `interval` (12h) as
 * declared in package.json. Both updates are quiet — we don't render UI; just
 * log to history and optionally show a HUD.
 *
 * Configuration lives in command preferences (right-click the command in
 * Raycast → Configure Command → Preferences). The `Preferences.AutoUpdate`
 * type is generated from package.json by `ray build`.
 */
export default async function AutoUpdate() {
  const prefs = getPreferenceValues<Preferences.AutoUpdate>();

  // Respect quiet hours (00:00–07:00 local)
  if (prefs.quietHours) {
    const hour = new Date().getHours();
    if (hour < 7) return;
  }

  let brewUpdated = 0;
  let masUpdated = 0;

  // Scan first so we know what was outdated *before* we upgrade — gives us
  // accurate history entries (Updates Everything also relies on this pattern).
  let preScan;
  try {
    preScan = await scanAll();
  } catch {
    preScan = null;
  }

  if (prefs.enableBrew) {
    // Per-cask + formula-only, mirroring Update Everything. A single
    // `brew upgrade --greedy` would fail the whole run if any one cask (or an
    // unrelated untrusted tap) errored, recording no history even for the casks
    // that DID upgrade. Doing them individually means each success is counted
    // and logged independently.
    try {
      await brewUpdateIndex();
    } catch {
      /* soft fail */
    }
    const before =
      preScan?.apps.filter(
        (a) => a.hasUpdate && a.source === "homebrew-cask",
      ) ?? [];
    for (const a of before) {
      try {
        const r = await upgradeCask(
          a.caskToken ?? a.app.name.toLowerCase(),
          a.app.name,
        );
        if (r.success) {
          brewUpdated++;
          recordHistory({
            name: a.app.name,
            bundleId: a.app.bundleId,
            source: "homebrew-cask",
            fromVersion: a.app.version,
            toVersion: a.latestVersion,
            trigger: "auto",
          });
        }
      } catch {
        // best-effort — one cask failing never blocks the rest
      }
    }

    const beforeFormulae =
      preScan?.cliPackages.filter((p) => p.source === "homebrew-formula") ?? [];
    if (beforeFormulae.length > 0) {
      try {
        const r = await upgradeAllFormulae();
        if (r.success) {
          brewUpdated += beforeFormulae.length;
          for (const p of beforeFormulae) {
            recordHistory({
              name: p.name,
              source: "homebrew-formula",
              fromVersion: p.currentVersion,
              toVersion: p.latestVersion,
              trigger: "auto",
            });
          }
        }
      } catch {
        // ignore
      }
    }
  }

  if (prefs.enableMas && (await isMasInstalled())) {
    try {
      const mas = findMas() ?? "mas";
      await runShell(`${mas} upgrade`);
      const beforeMas =
        preScan?.apps.filter((a) => a.hasUpdate && a.source === "mas") ?? [];
      masUpdated = beforeMas.length;
      for (const a of beforeMas) {
        recordHistory({
          name: a.app.name,
          bundleId: a.app.bundleId,
          source: "mas",
          fromVersion: a.app.version,
          toVersion: a.latestVersion,
          trigger: "auto",
        });
      }
    } catch {
      // ignore
    }
  }

  // Re-scan so the menu bar / next open show the new state immediately
  try {
    const post = await scanAll();
    saveScanCache(post);
  } catch {
    // ignore
  }

  if (prefs.notifyOnSuccess && brewUpdated + masUpdated > 0) {
    const parts: string[] = [];
    if (brewUpdated > 0) parts.push(`${brewUpdated} via Homebrew`);
    if (masUpdated > 0) parts.push(`${masUpdated} via App Store`);
    await showHUD(`🎉 Auto-update: ${parts.join(" · ")}`);
  }
}
