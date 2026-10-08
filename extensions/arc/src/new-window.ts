import { closeMainWindow, LaunchProps, showToast, Toast } from "@raycast/api";
import { getValidatedSpaceTitle, makeNewWindow } from "./arc";
import { WindowArguments } from "./types";

export default async function command(props: LaunchProps<{ arguments: WindowArguments }>) {
  const space = await getValidatedSpaceTitle(props.arguments.space);

  try {
    await closeMainWindow();
    await makeNewWindow({ space: space });
  } catch {
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed opening a new window",
    });
  }
}
