import { closeMainWindow, getPreferenceValues, getSelectedText, LaunchProps } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { makeNewLittleWindow } from "./cra";
import { config } from "./new-incognito-window";
import { NewTabSearchConfigs } from "./types";
import { isURL, normalizeURL } from "./utils";

export default async function command(props: LaunchProps<{ arguments: Arguments.NewLittleWindow }>) {
  const preferences = getPreferenceValues<Preferences.NewLittleWindow>();
  const selectedText = await getSelectedText().catch(() => ""); // No selection is fine.

  let target = props.arguments.url || selectedText;
  if (target) {
    target = isURL(target)
      ? target
      : `${config[preferences.engine as keyof NewTabSearchConfigs]}${encodeURIComponent(target)}`;
  } else {
    target = props.fallbackText || preferences.url;
  }

  try {
    const url = normalizeURL(target);
    await closeMainWindow();
    await makeNewLittleWindow(url);
  } catch (error) {
    await showFailureToast(error, { title: "Failed opening a new Little Window" });
  }
}
