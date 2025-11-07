import { Clipboard, showToast, Toast } from "@raycast/api";
import { typst2tex } from "tex2typst";

export default async function Command() {
  const { text } = await Clipboard.read();
  if (!text || text.trim().length === 0) {
    await showToast({
      title: "Failed to convert",
      message: "No Typst text found in clipboard.",
      style: Toast.Style.Failure,
    });
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
    await showToast({
      title: "変換に失敗しました。",
      message,
      style: Toast.Style.Failure,
    });
  }
}
