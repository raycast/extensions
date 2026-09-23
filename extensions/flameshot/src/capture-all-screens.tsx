import { closeMainWindow, LaunchProps, showHUD } from "@raycast/api";
import { allScreens } from "./utils/screenshot";

export default async function Command(props: LaunchProps<{ arguments: Arguments.CaptureScreen }>) {
  await closeMainWindow({ clearRootSearch: true });
  const screenshot = await allScreens(Number(props.arguments.delay));

  if (!screenshot) return;

  await showHUD("Captured all screens");
}
