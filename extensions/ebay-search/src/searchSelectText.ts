import {
  Clipboard,
  PopToRootType,
  Toast,
  closeMainWindow,
  environment,
  getPreferenceValues,
  getSelectedText,
  open,
  showToast,
} from "@raycast/api";
import { getSearchUrl, rememberSearch } from "./search";

export default async function Command() {
  const mode = environment.commandName === "searchSoldSelectedText" ? "sold" : "active";
  const { marketplace, useClipboardFallback } = getPreferenceValues<Preferences.SearchSelectText>();

  try {
    let query = (await getSelectedText().catch(() => "")).trim();
    if (!query && useClipboardFallback) query = (await Clipboard.readText())?.trim() ?? "";

    if (!query) {
      await showToast({
        style: Toast.Style.Failure,
        title: useClipboardFallback ? "No Selected or Clipboard Text" : "No Text Selected",
      });
      return;
    }

    await open(getSearchUrl(query, marketplace, mode));
    rememberSearch(query);
    await closeMainWindow({ clearRootSearch: true, popToRootType: PopToRootType.Immediate });
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Could Not Search eBay",
      message: error instanceof Error ? error.message : String(error),
    });
  }
}
