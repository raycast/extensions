import { CustomControlForm } from "./custom-control-form";
import { upsertPreset } from "./lib/presets";
import type { CustomPreset } from "./types";

export default function Command() {
  async function savePreset(preset: CustomPreset) {
    await upsertPreset(preset);
  }

  return <CustomControlForm onSave={savePreset} />;
}
