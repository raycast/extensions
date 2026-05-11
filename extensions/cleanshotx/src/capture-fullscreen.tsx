import { LaunchProps, closeMainWindow, open } from "@raycast/api";

export default async function Command(props: LaunchProps<{ arguments: Arguments.CaptureFullscreen }>) {
  const url = "cleanshot://capture-fullscreen";
  await closeMainWindow();
  if (props.arguments?.action) open(url + "?action=" + props.arguments.action);
  else open(url);
}
