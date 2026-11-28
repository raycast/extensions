import { Clipboard, showHUD, showToast, Toast } from "@raycast/api";
import { redactText, summarize } from "./redact";

export default async function Command() {
  const text = await Clipboard.readText();
  if (!text?.trim()) {
    await showHUD("Clipboard has no text");
    return;
  }

  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Redacting…",
  });
  try {
    const redaction = await redactText(text);
    await Clipboard.copy(redaction.redactedText);
    await toast.hide();
    await showHUD(`${summarize(redaction)} · copied to clipboard`);
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = "Redaction failed";
    toast.message = String(error);
  }
}
