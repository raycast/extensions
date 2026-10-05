import { Clipboard, Toast, showHUD, showToast } from "@raycast/api";
import { openLinks } from "./openLinks";
import { friendly } from "./errors";

export default async function main() {
  try {
    const clipboardText = await Clipboard.readText();
    if (!clipboardText) {
      await showHUD("Clipboard is empty");
      return;
    }
    const result = await openLinks(clipboardText, { source: "clipboard" });

    if (result.cancelled) return;
    if (result.total === 0) {
      await showHUD("No URLs found");
      return;
    }
    if (result.failed > 0) {
      await showToast({
        style: Toast.Style.Failure,
        title: `Opened ${result.opened} of ${result.total}`,
        message: "Some links failed (file missing or no app handler)",
      });
      return;
    }
    await showHUD(`Opened ${result.total} link(s)`);
  } catch (e) {
    await showHUD(`Error: ${friendly(e)}`);
  }
}
