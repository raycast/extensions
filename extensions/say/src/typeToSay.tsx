import { LaunchProps } from "@raycast/api";
import { say, SayOptions } from "mac-say";
import { omitBy } from "lodash";
import { getParsedSaySettings } from "./utils.js";

type LaunchContext = {
  sayOptions: SayOptions;
};

export default async function TypeToSay({
  arguments: args,
  launchContext,
}: LaunchProps<{ arguments: Arguments.TypeToSay; launchContext?: LaunchContext }>) {
  if (!args.content) return;
  const saySettings = getParsedSaySettings();
  await say(args.content, { ...saySettings, ...omitBy(launchContext?.sayOptions, (v) => !v) });
}
