import { closeMainWindow, launchCommand, LaunchProps, LaunchType, LocalStorage, showHUD } from "@raycast/api";
import { pickColorWithPanel, sampleScreenColor } from "swift:../swift";
import { normalizeColor, saveColor } from "./colors";

type Context = { mode?: "panel" | "screen"; current?: string };

/** Picks the equation color with the macOS color panel or the screen eyedropper, then reopens TeXPaste. */
export default async function Command(props: LaunchProps<{ launchContext: Context }>) {
  const mode = props.launchContext?.mode ?? "screen";
  await closeMainWindow();
  let picked: string | null = null;
  try {
    const result =
      mode === "panel"
        ? await pickColorWithPanel(normalizeColor(props.launchContext?.current) ?? "#000000")
        : await sampleScreenColor();
    picked = normalizeColor(result);
  } catch (e) {
    await showHUD(`Could not pick a color: ${String(e)}`);
    return;
  }
  if (!picked) return; // cancelled
  await saveColor(LocalStorage, picked);
  await launchCommand({ name: "tex", type: LaunchType.UserInitiated, context: { picked } });
}
