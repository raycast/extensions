import { LaunchProps, Toast, getPreferenceValues, showToast } from "@raycast/api";
import { runConversionToHud } from "./lib/run-conversion";
import { resolveUrlFromArgOrClipboard } from "./lib/url-source";
import type { CommandArguments } from "./lib/types";

export default async function ConvertUrlToClipboard(props: LaunchProps<{ arguments: CommandArguments }>) {
  const preferences = getPreferenceValues<Preferences>();
  const url = await resolveUrlFromArgOrClipboard(props.arguments.url);

  if (!url) {
    await showToast({
      style: Toast.Style.Failure,
      title: "No URL provided",
      message: "Pass a URL or copy one to your clipboard first.",
    });
    return;
  }

  await runConversionToHud({ url, destination: "clipboard", preferences });
}
