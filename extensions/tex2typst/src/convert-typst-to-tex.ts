import { Clipboard, showToast, Toast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { typst2tex } from "tex2typst";

export default async function Command() {
  const { text } = await Clipboard.read();
  if (!text || text.trim().length === 0) {
    await showFailureToast("No Typst text found in clipboard.");
    return;
  }

  try {
    const tex = typst2tex(text);
    await Clipboard.copy(tex);
    await showToast({
      title: "Conversion completed",
      message: "TeX text copied to clipboard.",
      style: Toast.Style.Success,
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    await showFailureToast(message);
  }
}
