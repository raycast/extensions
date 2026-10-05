import { Clipboard, showToast, Toast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { tex2typst } from "tex2typst";

export default async function Command() {
  const { text } = await Clipboard.read();
  if (!text || text.trim().length === 0) {
    await showFailureToast("No TeX text found in clipboard.");
    return;
  }

  try {
    const typst = tex2typst(text);
    await Clipboard.copy(typst);
    await showToast({
      title: "Conversion completed",
      message: "Typst text copied to clipboard.",
      style: Toast.Style.Success,
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    await showFailureToast(message);
  }
}
