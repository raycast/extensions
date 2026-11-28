import {
  Clipboard,
  getSelectedText,
  showHUD,
  showToast,
  Toast,
} from "@raycast/api";
import { redactText, summarize } from "./redact";

export default async function Command() {
  let text: string;
  try {
    text = await getSelectedText();
  } catch {
    await showHUD("No text selected");
    return;
  }

  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Redacting…",
  });
  try {
    const redaction = await redactText(text);
    await Clipboard.paste(redaction.redactedText);
    await toast.hide();
    await showHUD(summarize(redaction));
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = "Redaction failed";
    toast.message = String(error);
  }
}
