import { LaunchProps, closeMainWindow, open } from "@raycast/api";
import { constructFollowIntent } from "./lib/follow-intent";

export default async function Command(props: LaunchProps<{ arguments: Arguments.QuickFollow }>) {
  const { username } = props.arguments;

  const url = constructFollowIntent({ username });

  await closeMainWindow();
  await open(url);
}
