import { getPreferenceValues, LaunchProps, open } from "@raycast/api";

export default async function Command(props: LaunchProps<{ arguments: Arguments.AskT3Chat }>) {
  const { model } = getPreferenceValues<Preferences.AskT3Chat>();

  await open(
    `https://t3.chat/new?q=${encodeURIComponent(props.arguments.query ?? props.fallbackText ?? "")}&model=${encodeURIComponent(model)}`,
  );
}
