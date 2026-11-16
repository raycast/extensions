import { Tool } from "@raycast/api";
import { processAudio, resolveInputPaths } from "../audio";
import { OutputFormat, Preset, presets, resolveAudioOptions } from "../audio-options";

type Input = {
  /** Absolute paths to local audio files. Use paths the user provides or explicitly selects. */
  paths: string[];
  /** Slowed and nightcore change speed and pitch. Tempo changes speed while preserving pitch. Convert only changes the format. */
  preset: Preset;
  /** Output format. Omit to use the extension's default. */
  format?: OutputFormat;
  /** Speed multiplier from 0.5 to 2. Use only for slowed, slowed-reverb, nightcore, or tempo. Omit to use preferences. */
  speed?: number;
  /** Reverb amount from 0 to 100. Use only for reverb or slowed-reverb. Default is 50. */
  reverb?: number;
  /** Absolute path to an existing output folder. Omit to save beside each original. */
  outputDirectory?: string;
};

export const confirmation: Tool.Confirmation<Input> = async (input) => {
  const paths = resolveInputPaths(input.paths);
  const settings = resolveAudioOptions(input);
  return {
    message: `Create ${paths.length} new audio ${paths.length === 1 ? "file" : "files"}?`,
    info: [
      { name: "Preset", value: presets[settings.preset].title },
      { name: "Format", value: settings.format.toUpperCase() },
      { name: "Speed", value: settings.speed === undefined ? undefined : `${settings.speed}×` },
      { name: "Reverb", value: settings.reverb === undefined ? undefined : `${settings.reverb}%` },
      { name: "Save To", value: settings.outputDirectory ?? "Beside each original" },
      ...paths.map((value) => ({ name: "Input", value })),
    ],
  };
};

/** Apply an audio preset to one or more files and return the output path or error for each file. */
export default async function renderAudio(input: Input) {
  return processAudio(input.paths, input);
}
