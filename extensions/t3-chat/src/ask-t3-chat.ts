import { getPreferenceValues, LaunchProps, open } from "@raycast/api";

export default async function Command(props: LaunchProps<{ arguments: Arguments.AskT3Chat }>) {
  const { model, useBeta } = getPreferenceValues<Preferences.AskT3Chat>();

  const domain = useBeta ? "beta.t3.chat" : "t3.chat";
  await open(
    `https://${domain}/new?q=${encodeURIComponent(props.arguments.query ?? props.fallbackText ?? "")}&model=${encodeURIComponent(model)}`,
  );
}
