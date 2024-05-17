import { Cache, LaunchProps } from "@raycast/api";
import { say } from "mac-say";
import { defaultVoice } from "./constants.js";

const cache = new Cache();

export default async function TypeToSay({ arguments: args }: LaunchProps<{ arguments: Arguments.TypeToSay }>) {
  const cachedVoice = cache.get("voice") ?? `"${defaultVoice}"`;
  const voice = JSON.parse(cachedVoice);
  await say(args.content, { voice: voice === defaultVoice ? undefined : voice });
}
