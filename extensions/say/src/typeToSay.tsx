import { Cache, LaunchProps } from "@raycast/api";
import { say } from "mac-say";
import { systemDefault } from "./constants.js";

const cache = new Cache();
const getCache = (key: string) => JSON.parse(cache.get(key) ?? `"${systemDefault}"`);

export default async function TypeToSay({ arguments: args }: LaunchProps<{ arguments: Arguments.TypeToSay }>) {
  const voice = getCache("voice");
  const rate = getCache("rate");
  const audioDevice = getCache("audioDevice");
  await say(args.content, {
    voice: voice === systemDefault ? undefined : voice,
    rate: rate === systemDefault ? undefined : parseInt(rate, 10),
    audioDevice: audioDevice === systemDefault ? undefined : audioDevice,
  });
}
