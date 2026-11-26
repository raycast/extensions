import { Clipboard, showHUD, showToast, Toast } from "@raycast/api";
import { runUtility, UtilityError } from "./lib/utilities";

/**
 * Pretty-print the clipboard's JSON and put it back, without opening a view.
 * The same json-format the CLI and the RedBison JSON tools run, at its default
 * two-space indent and with key order kept.
 */
export default async function FormatClipboardJson() {
  const text = (await Clipboard.readText())?.trim();
  if (!text) {
    await showToast({ style: Toast.Style.Failure, title: "Clipboard Is Empty", message: "Copy some JSON first." });
    return;
  }
  try {
    const formatted = runUtility("json-format", text);
    await Clipboard.copy(formatted);
    await showHUD("Formatted JSON copied to clipboard");
  } catch (e) {
    const message = e instanceof UtilityError ? e.message : String(e);
    await showToast({ style: Toast.Style.Failure, title: "Not Valid JSON", message });
  }
}
