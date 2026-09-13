import { LaunchProps, showHUD, closeMainWindow } from "@raycast/api";
import { getCustomPresets, findPresetByName } from "./lib/mfc";
import { applyPresetAsHud, ensureInstalled } from "./lib/actions";

export default async function Command(props: LaunchProps<{ arguments: { preset: string } }>) {
  const wanted = props.arguments.preset ?? "";
  if (!(await ensureInstalled())) return;

  const customs = await getCustomPresets();
  const match = findPresetByName(wanted, customs);

  if (!match) {
    await closeMainWindow();
    const names = [...customs.map((p) => p.name), "Automatic", "Full Blast"];
    await showHUD(`⚠️  No preset named “${wanted}”. Available: ${names.join(", ")}`);
    return;
  }

  await applyPresetAsHud(match.ref, match.label);
}
