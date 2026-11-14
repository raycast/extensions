import { Clipboard, showHUD } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { openNewCodexThread } from "./utils/launch";

export default async function Command() {
  try {
    const prompt = (await Clipboard.readText())?.trim();
    if (!prompt) {
      await showHUD("Clipboard does not contain text");
      return;
    }

    await openNewCodexThread({ prompt });
  } catch (error) {
    await showFailureToast(error, { title: "Unable to start Codex thread" });
  }
}
