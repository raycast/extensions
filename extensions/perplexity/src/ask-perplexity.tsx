import { type LaunchProps, Toast, getPreferenceValues, open, showToast } from "@raycast/api";

const BROWSER_SEARCH_URL = "https://www.perplexity.ai/search";
const APP_SEARCH_URL = "perplexity-app://search";

export default async function Command(
  props: LaunchProps<{
    arguments: Arguments.AskPerplexity;
  }>,
) {
  const query = props.arguments.query;
  if (!query?.length) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Query cannot be empty",
    });
    return;
  }

  const params = new URLSearchParams({ q: query });
  const shouldUseApp = getPreferenceValues<Preferences.AskPerplexity>().perplexityApp;
  await open(`${shouldUseApp ? APP_SEARCH_URL : BROWSER_SEARCH_URL}?${params}`);
}
