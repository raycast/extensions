import { getSelectedText, Clipboard, showHUD, showToast, Toast } from "@raycast/api";
import { encode } from "@toon-format/toon";

export default async function main() {
  try {
    const selection = await getSelectedText();

    if (!selection) {
      await showToast({
        style: Toast.Style.Failure,
        title: "No selection detected",
      });
      return;
    }

    const data = JSON.parse(selection);
    const toon = encode(data);

    await Clipboard.copy(toon);
    await showHUD("Copied to clipboard (TOON ready)");
  } catch (err) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Invalid JSON",
      message: String(err),
    });
  }
}
