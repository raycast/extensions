import { LaunchProps, closeMainWindow, open } from "@raycast/api";

export default async function Command(
  props: LaunchProps<{ arguments: Arguments.Activity }>,
) {
  const url = "https://threads.net/activity/";
  await closeMainWindow();
  if (props.arguments?.page) open(url + props.arguments.page);
  else open(url);
}
