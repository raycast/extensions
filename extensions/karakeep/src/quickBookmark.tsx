import { getPreferenceValues, showToast, Toast, showHUD } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { logger } from "@chrismessina/raycast-logger";
import { fetchCreateBookmark } from "./apis";
import { getBrowserLink } from "./hooks/useBrowserLink";
import { Language, translations } from "./i18n";
import { translate } from "./i18n/translate";
import { Bookmark, Preferences } from "./types";

const log = logger.child("[QuickBookmark]");

export default async function QuickBookmark() {
  const preferences = getPreferenceValues<Preferences>();
  const language = (preferences.language as Language) || "en";
  const t = (key: string, params?: Record<string, string | number | undefined>) =>
    translate(translations[language], key, params);

  try {
    log.log("Starting quick bookmark");

    // Show initial toast
    const toast = await showToast({
      title: t("quickBookmark.gettingBrowserUrl"),
      style: Toast.Style.Animated,
    });

    // Get the current browser URL
    const url = await getBrowserLink();

    if (!url) {
      log.warn("Could not get browser URL");
      toast.style = Toast.Style.Failure;
      toast.title = t("quickBookmark.failedToGetBrowserUrl.title");
      toast.message = t("quickBookmark.failedToGetBrowserUrl.message");
      return;
    }

    log.log("Got browser URL", { url });
    toast.title = t("quickBookmark.creatingBookmark");

    // Create the bookmark
    const payload = {
      type: "link",
      url: url,
      createdAt: new Date().toISOString(),
    };

    const bookmark = (await fetchCreateBookmark(payload)) as Bookmark;

    if (!bookmark) {
      log.error("Bookmark creation returned empty result", { url });
      toast.style = Toast.Style.Failure;
      toast.title = t("quickBookmark.failedToCreateBookmark");
      return;
    }

    log.info("Quick bookmark created", { bookmarkId: bookmark.id, url });
    await showHUD(t("quickBookmark.successHud"));
  } catch (error) {
    log.error("Quick bookmark failed", { error });
    await showFailureToast({
      title: t("quickBookmark.failureToastTitle"),
      message: String(error),
    });
  }
}
