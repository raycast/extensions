import { Clipboard, Toast, showToast } from "@raycast/api";
import { getLatestTranscript } from "./lib/typeless";

export default async function Command() {
  try {
    const row = await getLatestTranscript();
    if (!row) {
      await showToast({
        style: Toast.Style.Failure,
        title: "No Typeless transcript found",
      });
      return;
    }

    await Clipboard.copy(row.transcript);
    await showToast({
      style: Toast.Style.Success,
      title: "Copied Typeless transcript",
      message: `${row.textLength} chars`,
    });
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Could not copy transcript",
      message: error instanceof Error ? error.message : String(error),
    });
  }
}
