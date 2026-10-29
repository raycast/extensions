import { LaunchProps, showHUD } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { findPreset, getPresets, playPreset } from "./presets";

export default async function Command({
  arguments: { preset: query },
}: LaunchProps<{ arguments: Arguments.LoadPreset }>) {
  try {
    const presets = await getPresets();
    const preset = findPreset(presets, query);
    if (!preset) {
      const names = presets.map((p) => p.name).join(", ");
      throw new Error(names ? `No single preset matches "${query}". Saved presets: ${names}` : "No saved presets yet");
    }
    await playPreset(preset);
    await showHUD(`Playing "${preset.name}"`);
  } catch (e) {
    await showFailureToast(e, { title: "Could not play preset" });
  }
}
