import type { LaunchProps } from "@raycast/api";
import { shootConfetti } from "./common";
import { loadConfettiConfiguration } from "./presets";

type LaunchContext = {
  presetId?: string;
};

export default async function Command({ launchContext }: LaunchProps<{ launchContext?: LaunchContext }>) {
  const configuration = loadConfettiConfiguration();

  const preset = launchContext?.presetId
    ? configuration.presets.find((candidate) => candidate.id === launchContext.presetId)
    : configuration.activePreset;

  shootConfetti({ playSound: configuration.preferences.confettiSound, emojis: preset?.emojis });
}
