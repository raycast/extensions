import { LaunchProps } from "@raycast/api";
import { execaSync } from "execa";

export default function TypeToSay({ arguments: args }: LaunchProps<{ arguments: Arguments.TypeToSay }>) {
  execaSync("say", [args.content]);
}
