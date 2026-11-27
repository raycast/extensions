import { Clipboard, LaunchProps, Toast, getPreferenceValues, showHUD, showToast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { isSearchBrowserInstalled, openUrlInSearch, showNotInstalledToast } from "./lib/browser";
import { SearchEngineId } from "./lib/constants";
import { readBrowserSettings } from "./lib/data";
import { buildNavigableUrl, getDomain, looksLikeUrl } from "./lib/utils";

export default async function OpenUrlCommand(props: LaunchProps<{ arguments: Arguments.OpenUrl }>) {
  if (!(await isSearchBrowserInstalled())) {
    await showNotInstalledToast();
    return;
  }

  let input = props.arguments.url?.trim() || "";
  if (!input) {
    const clipboardText = (await Clipboard.readText())?.trim() || "";
    // Only use clipboard contents when it looks like a URL so private text is never sent to a search engine.
    if (clipboardText && looksLikeUrl(clipboardText)) {
      input = clipboardText;
    }
  }

  if (!input) {
    await showToast({
      style: Toast.Style.Failure,
      title: "No URL or query provided",
      message: "Pass a URL or search query, or copy a URL to your clipboard first.",
    });
    return;
  }

  try {
    const preferences = getPreferenceValues<Preferences>();
    const settings = looksLikeUrl(input) ? null : readBrowserSettings();
    const { url, isSearch, engineName } = buildNavigableUrl(
      input,
      preferences.searchEngine as SearchEngineId | undefined,
      settings
    );
    await openUrlInSearch(url);
    await showHUD(
      isSearch ? `Searching ${engineName} in Search Browser` : `Opened ${getDomain(url)} in Search Browser`
    );
  } catch (error) {
    await showFailureToast(error, { title: "Failed to open URL in Search Browser" });
  }
}
