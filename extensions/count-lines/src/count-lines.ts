import {
  Clipboard,
  Toast,
  getPreferenceValues,
  getSelectedText,
  showHUD,
  showToast,
} from "@raycast/api";

type Prefs = {
  ignoreTrailingBlank: boolean;
  alsoShowNonEmpty: boolean;
  copyResultToClipboard: boolean;
  fallbackToClipboard: boolean;
};

function countLines(text: string, ignoreTrailingBlank: boolean) {
  const normalized = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  if (normalized.length === 0) {
    return { total: 0, nonEmpty: 0 };
  }
  const lines = normalized.split("\n");

  if (ignoreTrailingBlank) {
    while (lines.length > 0 && lines[lines.length - 1].trim() === "") {
      lines.pop();
    }
  }

  const total = lines.length;
  const nonEmpty = lines.filter((l) => l.trim() !== "").length;
  return { total, nonEmpty };
}

export default async function Command() {
  const prefs = getPreferenceValues<Prefs>();

  let text: string | undefined;
  try {
    text = await getSelectedText();
  } catch {
    // Some apps don't expose the selection. We'll fall back below if allowed.
  }

  if ((!text || text.length === 0) && prefs.fallbackToClipboard) {
    text = await Clipboard.readText();
  }

  if (!text || text.length === 0) {
    await showToast({
      style: Toast.Style.Failure,
      title: "No text found",
      message: "Select some text or copy to clipboard, then run again.",
    });
    return;
  }

  const { total, nonEmpty } = countLines(text, prefs.ignoreTrailingBlank);
  const msg =
    prefs.alsoShowNonEmpty && nonEmpty !== total
      ? `${total} line${total === 1 ? "" : "s"} (${nonEmpty} non-empty)`
      : `${total} line${total === 1 ? "" : "s"}`;

  if (prefs.copyResultToClipboard) {
    await Clipboard.copy(String(total));
  }

  await showHUD(msg);
}
