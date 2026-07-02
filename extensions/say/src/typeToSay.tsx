import { LaunchProps } from "@raycast/api";
import { omitBy } from "lodash";
import { say, SayOptions } from "./speech.js";
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
  await say(args.content, {
    ...saySettings,
    ...omitBy(launchContext?.sayOptions, (value) => value === undefined || value === null || value === ""),
  });
}
