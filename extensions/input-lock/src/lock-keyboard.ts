import { LaunchProps } from "@raycast/api";
import { lockInput } from "./lib/input-lock";

export default async function Command(props: LaunchProps<{ arguments: Arguments.LockKeyboard }>) {
  await lockInput({ blockPointer: false, duration: props.arguments.duration });
}
