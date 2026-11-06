import { Clipboard, closeMainWindow, getSelectedText, showHUD, showToast, Toast } from "@raycast/api";
import { transform as runModel } from "swift:../swift/writing-tools";

const RULES =
  "Keep the original language of the text. Output only the resulting text, with no preamble, quotes or explanations.";

// Reads the selection, runs it through the on-device model, pastes the result over it.
export async function transform(instructions: string) {
  let text: string;
  try {
    text = await getSelectedText();
  } catch {
    await showToast({ style: Toast.Style.Failure, title: "No text selected" });
    return;
  }
  await closeMainWindow();
  const toast = await showToast({ style: Toast.Style.Animated, title: "Apple Intelligence…" });
  try {
    const result = await runModel(`${instructions} ${RULES}`, text);
    await Clipboard.paste(result);
    await toast.hide();
    await showHUD("Done");
  } catch (e) {
    toast.style = Toast.Style.Failure;
    toast.title = "Failed";
    toast.message = e instanceof Error ? e.message : String(e);
  }
}
