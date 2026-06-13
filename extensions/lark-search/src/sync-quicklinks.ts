import {
  Clipboard,
  Toast,
  getPreferenceValues,
  showHUD,
  showInFinder,
  showToast,
} from "@raycast/api";
import { exportQuicklinks } from "./lib/quicklinks";
import { getQuicklinkApplicationName } from "./lib/preferences";
import { getRecents } from "./lib/recent-cache";

type Preferences = {
  quicklinkLimit: string;
};

export default async function Command() {
  const { quicklinkLimit } = getPreferenceValues<Preferences>();
  const limit = Math.max(1, Number.parseInt(quicklinkLimit, 10) || 30);
  const recents = await getRecents();
  const { filePath, count } = await exportQuicklinks(
    recents,
    limit,
    getQuicklinkApplicationName(),
  );

  await Clipboard.copy(filePath);

  if (count === 0) {
    await showToast({
      style: Toast.Style.Failure,
      title: "No Quicklinks exported",
      message: "Open a few Lark search results first, then export again.",
    });
    return;
  }

  await showInFinder(filePath);
  await showHUD(`Exported ${count} Lark Quicklinks. File path copied.`);
}
