import { Toast, getPreferenceValues, showToast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { doneMessage } from "./interactive";
import { prepareVault, runChoice } from "./obsidianCli";
import { resolveCaptureChoice } from "./capture-choice";
import { headlessCurrentNote } from "./current-note";
import { chooseVault, readRegistry } from "./vaults";

export interface CaptureContext {
  vaultPath?: string;
}

export async function capture(
  text: string,
  contextVaultPath: string | undefined,
): Promise<void> {
  const { captureChoice, vaultPath } =
    getPreferenceValues<Preferences.QuickCapture>();

  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Capturing...",
  });
  try {
    const registry = readRegistry();
    const chosen = chooseVault(contextVaultPath ?? vaultPath, registry);
    if (chosen.kind === "pick") {
      throw new Error(
        chosen.vaults.length > 0
          ? "Several vaults have QuickAdd. Choose one in the extension's Vault preference."
          : "No vault has QuickAdd enabled.",
      );
    }
    const ready = await prepareVault(chosen.vault, undefined, registry);
    if (!ready.ok) throw new Error(ready.message);
    const choice = resolveCaptureChoice(ready.choices, captureChoice);
    const result = await runChoice(chosen.vault, choice.id, {
      vars: { value: text },
      current: headlessCurrentNote(choice),
    });
    if (!result.ok) {
      throw new Error(result.error ?? "Capture failed");
    }
    toast.style = Toast.Style.Success;
    toast.title = doneMessage(choice.name, result);
  } catch (error) {
    await toast.hide();
    await showFailureToast(error, { title: "Could not capture" });
  }
}
