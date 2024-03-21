import { LocalStorage, Clipboard, showToast, Toast } from "@raycast/api";
import { LocalStorageValue } from "./types";

export default async function Command() {
  const entries = await LocalStorage.allItems<LocalStorageValue>();

  const jsonData = JSON.stringify(entries);
  await Clipboard.copy(jsonData);

  const text = await Clipboard.readText();
  if (text == jsonData) {
    await showToast({ title: "Copied jump data to clipboard!" });
  } else {
    await showToast({ title: "Failed to copy jump data to clipboard.", style: Toast.Style.Failure });
  }
}
