import { getPreferenceValues, showHUD } from "@raycast/api";
import { BREW, runShell } from "./utils/shell";
import { findMas, isMasInstalled } from "./utils/sources/mas";
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
    try {
      await runShell(`${BREW} update --quiet`);
      await runShell(`${BREW} upgrade --greedy --quiet`);
      const before =
        preScan?.apps.filter(
          (a) => a.hasUpdate && a.source === "homebrew-cask",
        ) ?? [];
      const beforeFormulae =
        preScan?.cliPackages.filter((p) => p.source === "homebrew-formula") ??
        [];
      brewUpdated = before.length + beforeFormulae.length;
      for (const a of before) {
        recordHistory({
          name: a.app.name,
          bundleId: a.app.bundleId,
          source: "homebrew-cask",
          fromVersion: a.app.version,
          toVersion: a.latestVersion,
          trigger: "auto",
        });
      }
      for (const p of beforeFormulae) {
        recordHistory({
          name: p.name,
          source: "homebrew-formula",
          fromVersion: p.currentVersion,
          toVersion: p.latestVersion,
          trigger: "auto",
        });
      }
    } catch {
      // best-effort — auto-update never blocks the user with an error UI
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
