import { getPreferenceValues, LaunchProps, open } from "@raycast/api";

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

  await open(url.toString());
}
