import { LaunchProps, showHUD } from "@raycast/api";
import { loadPresets } from "./presets";
import { applyAndNotify } from "./resize";

export default async function Command(props: LaunchProps<{ arguments: { preset: string } }>) {
  const query = props.arguments.preset.trim().toLowerCase();
  const { presets } = loadPresets();

  const preset =
    presets.find((p) => p.id.toLowerCase() === query) ??
    presets.find((p) => p.name.toLowerCase().includes(query));

  if (!preset) {
    await showHUD(`No preset matching “${props.arguments.preset}”`);
    return;
  }
  await applyAndNotify(preset);
}
