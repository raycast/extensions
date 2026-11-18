import { Clipboard, showHUD } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { glimpse, HistoryRecord } from "./glimpse";

export default async function Command() {
  try {
    const { record } = await glimpse<{ record: HistoryRecord | null }>(["history", "last"]);
    if (!record) {
      await showHUD("No dictations yet");
      return;
    }
    await Clipboard.copy(record.text);
    await showHUD("Last dictation copied");
  } catch (error) {
    await showFailureToast(error, { title: "Couldn't copy last dictation" });
  }
}
