import { getPreferenceValues, showToast, Toast, showHUD } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { fetchCreateBookmark } from "./apis";
import { getBrowserLink } from "./hooks/useBrowserLink";
import { Language, translations } from "./i18n";
import { translate } from "./i18n/translate";
import { Bookmark, Preferences } from "./types";

export default async function QuickBookmark() {
  const preferences = getPreferenceValues<Preferences>();
  const language = (preferences.language as Language) || "en";
  const t = (key: string, params?: Record<string, string | number | undefined>) =>
    translate(translations[language], key, params);

  try {
    // Show initial toast
    const toast = await showToast({
      title: t("quickBookmark.gettingBrowserUrl"),
      style: Toast.Style.Animated,
    });

    // Get the current browser URL
    const url = await getBrowserLink();

    if (!url) {
      toast.style = Toast.Style.Failure;
      toast.title = t("quickBookmark.failedToGetBrowserUrl.title");
      toast.message = t("quickBookmark.failedToGetBrowserUrl.message");
      return;
    }

    toast.title = t("quickBookmark.creatingBookmark");

    // Create the bookmark
    const payload = {
      type: "link",
      url: url,
      createdAt: new Date().toISOString(),
    };

    const bookmark = (await fetchCreateBookmark(payload)) as Bookmark;

    if (!bookmark) {
      toast.style = Toast.Style.Failure;
      toast.title = t("quickBookmark.failedToCreateBookmark");
      return;
    }

    await showHUD(t("quickBookmark.successHud"));
  } catch (error) {
    await showFailureToast({
      title: t("quickBookmark.failureToastTitle"),
      message: String(error),
    });
  }
}
