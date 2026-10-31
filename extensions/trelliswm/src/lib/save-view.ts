import { Alert, confirmAlert, showHUD } from "@raycast/api";
import { runTrellisCommand } from "./trellis";
import { loadViewNames, saveViewNames, viewTitle } from "./view-names";

/**
 * Saves where you are looking into view n, after a confirmation.
 * TrellisWM replaces the view without warning and cannot tell us if it was empty, so we always ask.
 * A new name replaces the old one. With no new name, the old name stays.
 */
export async function confirmAndSaveView(n: number, newName?: string): Promise<boolean> {
  const names = await loadViewNames();
  const label = names[n] ? `${names[n]} (View ${n})` : `View ${n}`;

  const confirmed = await confirmAlert({
    title: `Save to ${label}?`,
    message: "This replaces anything already saved in this view.",
    primaryAction: { title: "Save", style: Alert.ActionStyle.Destructive },
  });
  if (!confirmed || !(await runTrellisCommand(`save-view?n=${n}`))) {
    return false;
  }

  const name = newName?.trim();
  const next = name ? { ...names, [n]: name } : names;
  if (name) {
    await saveViewNames(next);
  }
  await showHUD(`Saved ${viewTitle(n, next)}`);
  return true;
}
