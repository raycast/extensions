import { closeMainWindow, showHUD } from "@raycast/api";
import { getFrontmostApp, pressUndo, selectLayout } from "./lib/macos";
import { clearLastFix, getLastFix } from "./lib/storage";

/** Undo only makes sense right after a fix; after that, ⌘Z would undo something else. */
const MAX_AGE_MS = 5 * 60_000;

export default async function Command() {
  await closeMainWindow();
  const last = await getLastFix();
  if (!last || Date.now() - last.date > MAX_AGE_MS) {
    await showHUD("No recent fix to undo");
    return;
  }

  const app = await getFrontmostApp().catch(() => null);
  if (last.app && app && last.app !== app) {
    await showHUD("Switch back to the app you fixed, then undo");
    return;
  }

  try {
    await pressUndo();
  } catch {
    await showHUD("Couldn't press ⌘Z. Allow Raycast in Accessibility settings");
    return;
  }
  if (last.switched && last.previousLang) await selectLayout(last.previousLang).catch(() => false);
  await clearLastFix();
  const preview = last.original.trim().replace(/\s+/g, " ");
  await showHUD(`Undone: ${preview.length > 50 ? preview.slice(0, 49) + "…" : preview}`);
}
