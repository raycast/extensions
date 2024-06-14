import { LaunchProps } from "@raycast/api";
import { say } from "mac-say";
import { getSaySettings, parseSaySettings } from "./utils.js";

export default async function TypeToSay({ arguments: args }: LaunchProps<{ arguments: Arguments.TypeToSay }>) {
  const saySettings = parseSaySettings(getSaySettings());
  await say(args.content, saySettings);
}
