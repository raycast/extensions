import { klack } from "../lib/klack";

type Input = {
  /** Volume percentage, integer 0–100. */
  volume: number;
};

export default async function tool(input: Input): Promise<string> {
  const target = Math.max(0, Math.min(100, Math.round(input.volume)));
  if ((await klack.currentVolume()) === target) {
    return `Volume was already at ${target}%.`;
  }
  const applied = await klack.setVolume(target);
  return `Volume set to ${applied}%.`;
}
