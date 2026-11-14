import { getPreferenceValues } from "@raycast/api";
import { DigFromSources } from "./components/DigFromSources";
import { DigResults } from "./components/DigResults";
import { fromBrowserTab, fromClipboard, fromSelection, UrlReader } from "./utils/urlSources";
import { urlFromInput } from "./utils/urlText";

export type { LoadingProgress } from "./hooks/useFetchSite";

const preferences = getPreferenceValues<Preferences.Digger>();

export default function Command(props: { arguments: Arguments.Digger }) {
  const input = props.arguments.url?.trim() ?? "";

  // A typed URL is dug as typed. The fallbacks are for an EMPTY argument only: a
  // typo is shown back in the search bar as one, not quietly replaced by
  // whatever is on the clipboard.
  if (input) {
    const url = urlFromInput(input);
    if (url) return <DigResults url={url} />;
    return <DigFromSources readers={[]} initialText={input} />;
  }

  // Selected text first, as Google Search does: it is the most deliberate of the three.
  const readers: UrlReader[] = [];
  if (preferences.autoLoadUrlFromSelectedText) readers.push(fromSelection);
  if (preferences.autoLoadUrlFromClipboard) readers.push(fromClipboard);
  if (preferences.enableBrowserExtensionSupport) readers.push(fromBrowserTab);

  return <DigFromSources readers={readers} showPreferences />;
}
