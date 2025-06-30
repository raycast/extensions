import { LaunchProps, closeMainWindow, open } from "@raycast/api";

export default async function Command(
  props: LaunchProps<{ arguments: Arguments.Feed }>,
) {
  const url = "https://threads.net/";
  await closeMainWindow();
  if (props.arguments?.feed) open(url + props.arguments.feed);
  else open(url);
}
