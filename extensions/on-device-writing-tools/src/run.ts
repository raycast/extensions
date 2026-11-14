import {
  Clipboard,
  closeMainWindow,
  getFrontmostApplication,
  getSelectedText,
  showHUD,
  showToast,
  Toast,
} from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { transform as runModel } from "swift:../swift/writing-tools";

const OUTPUT_RULES = "Output only the resulting text, with no preamble, quotes or explanations.";

async function selectionTarget() {
  const [app, text] = await Promise.all([getFrontmostApplication(), getSelectedText()]);
  return { bundleId: app.bundleId, text };
}

/**
 * Reads the selection, runs it through the on-device model, pastes the result over it.
 * `keepLanguage: false` lets the instruction ask for another language (e.g. translation).
 */
export async function transform(instructions: string, { keepLanguage = true } = {}) {
  let before: Awaited<ReturnType<typeof selectionTarget>>;
  try {
    before = await selectionTarget();
  } catch (error) {
    await showFailureToast(error, { title: "No text selected" });
    return;
  }
  await closeMainWindow();
  const toast = await showToast({ style: Toast.Style.Animated, title: "Apple Intelligence…" });
  let result: string;
  try {
    result = await runModel(`${instructions} ${OUTPUT_RULES}`, before.text, keepLanguage);
  } catch (error) {
    await toast.hide();
    await showFailureToast(error, { title: "Apple Intelligence failed" });
    return;
  }
  await toast.hide();

  // The model takes seconds: paste only if the user is still on the same app and selection.
  const after = await selectionTarget().catch(() => undefined);
  try {
    if (after && after.bundleId === before.bundleId && after.text === before.text) {
      await Clipboard.paste(result);
      await showHUD("Done");
    } else {
      await Clipboard.copy(result);
      await showHUD("Selection changed. Result copied to clipboard");
    }
  } catch (error) {
    await showFailureToast(error, { title: "Could not deliver result" });
  }
}
