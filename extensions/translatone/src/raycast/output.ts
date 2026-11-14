import { Clipboard, closeMainWindow, PopToRootType, showHUD } from "@raycast/api";
import type { OutputAction } from "../core/output";

export async function deliverTranslation(
  action: OutputAction,
  text: string,
  confirmation: string,
): Promise<void> {
  if (action === "copy") {
    await Clipboard.copy(text);
  } else {
    await closeMainWindow();
    await Clipboard.paste(text);
  }
  await showHUD(confirmation, { popToRootType: PopToRootType.Immediate });
}
