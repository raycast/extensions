import { getApplications, open, showHUD } from "@raycast/api";

const TUTTI_BUNDLE_ID = "com.recents.tutti";

let tuttiInstalled = false;

/** Whether the Tutti app is installed — it owns the `tutti://` scheme and writes
 * the preset export this extension reads. Caches the positive result: Tutti won't
 * vanish mid-session, so once found we skip re-enumerating every installed app on
 * later commands; a negative result is re-checked so a fresh install is picked up. */
export async function isTuttiInstalled(): Promise<boolean> {
  if (tuttiInstalled) return true;
  const apps = await getApplications();
  tuttiInstalled = apps.some((app) => app.bundleId === TUTTI_BUNDLE_ID);
  return tuttiInstalled;
}

/**
 * Fire a `tutti://` action and confirm with a HUD. If Tutti isn't installed,
 * say so instead of silently opening nothing. The whole automation surface is
 * Tutti Pro and gated inside Tutti; a non-Pro user sees Tutti's own upgrade HUD,
 * so "success" here means the action was delivered, not that it took effect.
 */
export async function runTuttiAction(url: string, hud: string): Promise<void> {
  if (!(await isTuttiInstalled())) {
    await showHUD("Tutti is not installed — install it to use these commands");
    return;
  }
  await open(url);
  await showHUD(hud);
}
