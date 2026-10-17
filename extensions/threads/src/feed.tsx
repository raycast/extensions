import { LaunchProps, closeMainWindow, open } from "@raycast/api";
import { THREADS_BASE_URL } from "./lib/constants";

export default async function Command(props: LaunchProps<{ arguments: Arguments.Feed }>) {
  const url = `${THREADS_BASE_URL}/`;
  await closeMainWindow();
  if (props.arguments?.feed) open(url + props.arguments.feed);
  else open(url);
}
