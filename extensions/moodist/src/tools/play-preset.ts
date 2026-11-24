import { describePreset, findPreset, getPresets, playPreset } from "../presets";

type Input = {
  /** Name of a saved preset, e.g. "Focus". Matched case-insensitively, and a partial name works if it is unique. */
  name: string;
};

export default async function tool({ name }: Input) {
  const presets = await getPresets();
  if (presets.length === 0) throw new Error("There are no saved presets. Save one from Manage Presets first.");
  const preset = findPreset(presets, name);
  if (!preset) {
    throw new Error(`No single preset matches "${name}". Saved presets: ${presets.map((p) => p.name).join(", ")}.`);
  }
  await playPreset(preset);
  return { preset: preset.name, playing: describePreset(preset) };
}
