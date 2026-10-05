import { Toast, getSelectedText, showHUD, showToast } from "@raycast/api";
import { openLinks } from "./openLinks";
import { friendly } from "./errors";

export default async function main() {
  try {
    const text = await getSelectedText();
    const result = await openLinks(text, { source: "selection" });

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
    await showHUD(e instanceof Error && /selection/i.test(e.message) ? "No text selected" : `Error: ${friendly(e)}`);
  }
}
