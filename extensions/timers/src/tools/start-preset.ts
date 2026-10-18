import { readCustomTimers, startTimer } from "../backend/timerBackend";
import { CustomTimer } from "../backend/types";

type StartPresetToolInput = {
  /**
   * The name of the preset timer to be started.
   */
  name: string;
};

export default async function (input: StartPresetToolInput): Promise<string | null> {
  const presets: Record<string, CustomTimer> = readCustomTimers();
  const selectedPreset = Object.values(presets).filter((x) => x.name === input.name)[0];

  if (selectedPreset === undefined) return null;

  startTimer({
    timeInSeconds: selectedPreset.timeInSeconds,
    timerName: selectedPreset.name,
    launchedFromMenuBar: false,
    skipRingContinuouslyWarning: true,
  });
  return selectedPreset.name;
}
