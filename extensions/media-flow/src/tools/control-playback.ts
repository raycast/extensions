import type { Tool } from "@raycast/api";
import { controlSource, getMediaSources } from "../core/mediaService";
import { registerAllProviders } from "../core/setup";
import type { PlaybackCommand } from "../core/types";

type Input = {
  /** One of: play, pause, playpause, next, previous */
  command: PlaybackCommand;
};

export default async function tool(input: Input): Promise<string> {
  registerAllProviders();
  const { sources } = await getMediaSources();
  const target = sources.find((s) => s.isPlaying) ?? sources[0];
  if (!target) return "Nothing to control — no active media source.";
  await controlSource(target, input.command);
  return `Sent "${input.command}" to ${target.appName}.`;
}

export const confirmation: Tool.Confirmation<Input> = async (input) => ({
  message: `Send "${input.command}" to the current player?`,
});
