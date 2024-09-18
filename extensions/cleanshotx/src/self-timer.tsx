import { LaunchProps, closeMainWindow, open } from "@raycast/api";

export default async function Command(props: LaunchProps<{ arguments: Arguments.SelfTimer }>) {
  const url = "cleanshot://self-timer";
  await closeMainWindow();
  if (props.arguments?.action) open(url + "?action=" + props.arguments.action);
  else open(url);
}
