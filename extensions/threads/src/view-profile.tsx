import { LaunchProps, closeMainWindow, open } from "@raycast/api";
import { THREADS_BASE_URL } from "./lib/constants";

export default async function Command(props: LaunchProps<{ arguments: Arguments.ViewProfile }>) {
  const { username } = props.arguments;
  const cleanUsername = username.startsWith("@") ? username.slice(1) : username;
  const url = `${THREADS_BASE_URL}/@${cleanUsername}`;

  await closeMainWindow();
  await open(url);
}
