import { failToast, showError } from "@chrismessina/raycast-kit/toast";
import { showHUD, showToast, Toast } from "@raycast/api";
import { applyOperation, continuityMessage } from "./control";
import { hud } from "./displays";
import { status } from "./helper";
import type { Operation } from "./intent";
import { log } from "./log";

/** `saturatedHud` replaces the HUD when the operation changed nothing ("XDR Boost Already at Max"). */
export async function runNoView(op: Operation, title: string, saturatedHud?: string): Promise<void> {
  let toast: Toast | undefined;
  try {
    if ((await status()).displays.length === 0) {
      await showHUD("No XDR Display Found");
      return;
    }
    toast = await showToast({ style: Toast.Style.Animated, title });
    const applied = await applyOperation(op, { refreshMenuBar: true });
    await toast.hide();
    await showHUD(
      continuityMessage(applied) ?? (applied.saturated && saturatedHud ? saturatedHud : hud(applied.after)),
    );
  } catch (error) {
    log("failed", { op, error: error instanceof Error ? error.message : String(error) });
    if (toast) failToast(toast, error, { title: "Couldn't Change XDR Boost" });
    else await showError(error, { title: "Couldn't Change XDR Boost" });
  }
}
