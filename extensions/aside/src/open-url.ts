import { closeMainWindow, getPreferenceValues, LaunchProps, showHUD } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { createTab } from "./lib/browser";
import { resolveInput } from "./lib/url";
import { Preferences } from "./types";

export default async function Command(props: LaunchProps<{ arguments: { input: string } }>) {
  try {
    const { searchEngine } = getPreferenceValues<Preferences>();
    const target = resolveInput(props.arguments.input, searchEngine);
    await createTab(target);
    await closeMainWindow();
    await showHUD("Opened in Aside");
  } catch (error) {
    await showFailureToast(error, { title: "Failed opening in Aside" });
  }
}
