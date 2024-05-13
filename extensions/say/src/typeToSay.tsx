import { LaunchProps } from "@raycast/api";
import { say } from "mac-say";

export default async function TypeToSay({ arguments: args }: LaunchProps<{ arguments: Arguments.TypeToSay }>) {
  await say(args.content);
}
