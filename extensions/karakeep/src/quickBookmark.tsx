import { showToast, Toast, showHUD } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { logger } from "@chrismessina/raycast-logger";
import { fetchCreateBookmark } from "./apis";
import { getBrowserLink } from "./hooks/useBrowserLink";
import { Bookmark } from "./types";
import { getTranslator } from "./i18n/standalone";
import { ensureReachable } from "./utils/submitGuard";
import { toErrorMessage } from "./utils/toast";

const log = logger.child("[QuickBookmark]");

export default async function QuickBookmark() {
  const t = getTranslator();

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

    // No UI to fall back on here, so recover inline: start a stopped local
    // container and wait, rather than failing with a URL the user then has to
    // go and find again. ensureReachable drives its own toast.
    if ((await ensureReachable(url, toast)) === "unreachable") return;

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
      // toErrorMessage unwraps a transport failure's cause; String(error) here
      // would render the useless "TypeError: fetch failed".
      message: toErrorMessage(error),
    });
  }
}
