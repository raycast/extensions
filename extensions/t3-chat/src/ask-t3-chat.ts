import { getPreferenceValues, LaunchProps, open, showHUD } from "@raycast/api";
import { isSearchGroundingSupported } from "./utils/model-check";

export default async function Command(props: LaunchProps<{ arguments: Arguments.AskT3Chat }>) {
  const { model, useBeta } = getPreferenceValues<Preferences.AskT3Chat>();

  const domain = useBeta ? "beta.t3.chat" : "t3.chat";
  const enableSearch = props.arguments.search === "true";

  const url = new URL(`https://${domain}/new`);
  url.searchParams.set("q", props.arguments.query ?? props.fallbackText ?? "");
  url.searchParams.set("model", model);
  if (enableSearch) {
    url.searchParams.set("search", "true");
  }

  if (enableSearch && !isSearchGroundingSupported(model)) {
    await showHUD("Search grounding is not supported for this model");
  }

  await open(url.toString());
}
