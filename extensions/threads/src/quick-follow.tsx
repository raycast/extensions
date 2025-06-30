import { LaunchProps, closeMainWindow, open } from "@raycast/api";
import { constructFollowIntent } from "./lib/follow-intent";

interface Arguments {
  username: string;
}

export default async function Command(
  props: LaunchProps<{ arguments: Arguments }>,
) {
  const { username } = props.arguments;

  const url = constructFollowIntent({ username });

  await closeMainWindow();
  await open(url);
}
