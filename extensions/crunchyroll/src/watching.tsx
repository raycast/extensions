import { openCrunchyroll, openCrunchyrollURL } from "./webapp";
import { fetchHistory, getHistoryFromCache } from "./query";
import { showToast, Toast } from "@raycast/api";

export default async function WatchingCommand() {
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Finding your last episode...",
    message: "Reading Crunchyroll history",
  });

  try {
    // Try cached first (instant), then fresh fetch
    let history = await getHistoryFromCache();
    if (!history || history.length === 0) {
      history = await fetchHistory();
    }

    if (history && history.length > 0) {
      const last = history[0];
      toast.style = Toast.Style.Success;
      toast.title = "Opening last watched anime";
      toast.message = last.title;
      await openCrunchyrollURL(last.url);
      return;
    }

    toast.style = Toast.Style.Failure;
    toast.title = "No history found";
    toast.message = "Opening Crunchyroll homepage instead";
  } catch {
    toast.style = Toast.Style.Failure;
    toast.title = "Couldn't fetch history";
    toast.message = "Opening Crunchyroll homepage instead";
  }

  await openCrunchyroll();
}
