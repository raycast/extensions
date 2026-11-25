import { closeMainWindow, getPreferenceValues, LaunchProps } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { getValidatedSpaceTitle, makeNewWindow } from "./cra";

export default async function command(props: LaunchProps<{ arguments: Arguments.NewWindow }>) {
  const preferences = getPreferenceValues<Preferences.NewWindow>();

  try {
    const space = await getValidatedSpaceTitle(props.arguments.space || preferences.space);
    await closeMainWindow();
    await makeNewWindow({ space });
  } catch (error) {
    await showFailureToast(error, { title: "Failed opening a new window" });
  }
}
