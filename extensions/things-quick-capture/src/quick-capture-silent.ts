import {
  closeMainWindow,
  showHUD,
  getPreferenceValues,
  open,
} from "@raycast/api";
import {
  getFrontmostAppContext,
  formatTitleWithEmoji,
} from "./lib/frontmost-app";
import { buildThingsUrl } from "./lib/things-url";
import { Preferences } from "./lib/types";

export default async function Command() {
  const preferences = getPreferenceValues<Preferences>();

  try {
    const context = await getFrontmostAppContext();

    if (!context.title) {
      await showHUD("No context to capture");
      return;
    }

    const formattedTitle = formatTitleWithEmoji(context);

    const title =
      preferences.urlInNotes === "notes"
        ? formattedTitle
        : context.url
          ? `${formattedTitle} - ${context.url}`
          : formattedTitle;

    const notes =
      preferences.urlInNotes === "notes" ? context.url || undefined : undefined;

    const url = buildThingsUrl({
      title,
      notes,
      when:
        preferences.defaultList === "inbox"
          ? undefined
          : preferences.defaultList,
      showQuickEntry: preferences.showQuickEntry,
    });

    await closeMainWindow();
    await open(url);
    await showHUD(`✓ Added: ${context.title}`);
  } catch (error) {
    await showHUD(`✗ Failed: ${String(error)}`);
  }
}
