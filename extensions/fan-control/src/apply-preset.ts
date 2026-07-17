import { LaunchProps, showHUD } from "@raycast/api";
import { readPresets } from "./lib/presets";
import { setFanSpeed } from "./lib/smctl";

export default async function Command(
  props: LaunchProps<{ arguments: Arguments.ApplyPreset }>,
) {
  const presets = await readPresets();
  const preset = presets.find((item) => item.id === props.arguments.presetId);

  if (!preset) {
    await showHUD("⚠️ This fan preset was deleted — remove its Quicklink");
    return;
  }

  try {
    await setFanSpeed(preset.rpm);
    await showHUD(`⭐ ${preset.name} — ${preset.rpm.toLocaleString()} RPM`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await showHUD(`❌ ${preset.name} failed: ${message}`);
  }
}
