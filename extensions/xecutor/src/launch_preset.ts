import { LocalStorage } from "@raycast/api";
import { Preset } from "./types";
import { showFailureToast } from "@raycast/utils";
import { executePreset } from "./utils/utils";

const _retrievePreset = (presets: Preset[], preset_name: string) => {
  for (const preset of presets) {
    if (preset.name == preset_name) {
      return preset;
    }
  }

  throw new Error(`Preset ${preset_name} not found`);
};

export default async function Command(props: { arguments: { preset_name: string } }) {
  const maybeAppPresets = await LocalStorage.getItem("xecutor");
  let preset;

  if (maybeAppPresets) {
    try {
      const appPresets = JSON.parse(maybeAppPresets as string);
      preset = _retrievePreset(appPresets, props.arguments.preset_name);
      await executePreset(preset);
    } catch (e) {
      showFailureToast(e, {
        title: "Error retrieving preset",
      });
    }
  }
}
