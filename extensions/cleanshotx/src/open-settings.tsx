import { LaunchProps, closeMainWindow, open } from "@raycast/api";

export default async function Command(props: LaunchProps<{ arguments: Arguments.OpenSettings }>) {
  const url = "cleanshot://open-settings";
  await closeMainWindow();
  if (props.arguments?.tab) open(url + "?tab=" + props.arguments.tab);
  else open(url);
}
