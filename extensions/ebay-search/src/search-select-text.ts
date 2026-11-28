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
import { showFailureToast } from "@raycast/utils";
import { getSearchUrl, rememberSearch } from "./search";

export default async function Command() {
  const mode = environment.entryPointName === "search-sold-selected-text" ? "sold" : "active";
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
    rememberSearch(mode, query);
    await closeMainWindow({ clearRootSearch: true, popToRootType: PopToRootType.Immediate });
  } catch (error) {
    await showFailureToast(error, { title: "Could Not Search eBay" });
  }
}
