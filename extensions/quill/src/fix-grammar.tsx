import {
  Clipboard,
  getSelectedText,
  showHUD,
  showToast,
  Toast,
} from "@raycast/api";
import { fmTransform, LicenseNotAgreedError } from "./fm";
import { fixGrammarInstructions } from "./instructions";
import { showLicenseToast } from "./license";

export default async function FixGrammar() {
  let selectedText: string;
  try {
    selectedText = await getSelectedText();
  } catch {
    await showHUD("No text selected");
    return;
  }

  if (!selectedText.trim()) {
    await showHUD("No text selected");
    return;
  }

  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Fixing grammar…",
  });

  try {
    const corrected = await fmTransform(fixGrammarInstructions, selectedText);
    await Clipboard.paste(corrected);
    toast.style = Toast.Style.Success;
    toast.title = "Grammar fixed";
  } catch (error) {
    if (error instanceof LicenseNotAgreedError) {
      await toast.hide();
      await showLicenseToast();
      return;
    }
    toast.style = Toast.Style.Failure;
    toast.title = "Could not fix grammar";
    toast.message = error instanceof Error ? error.message : String(error);
  }
}
