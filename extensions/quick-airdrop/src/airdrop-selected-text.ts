import { getSelectedText, showHUD, showToast, Toast } from "@raycast/api";
import { airDropItems, describeItems, isHttpUrl, writeTempTextFile } from "./lib/airdrop";

export default async function Command() {
  let selected = "";

  try {
    selected = await getSelectedText();
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Could not read selected text",
      message: error instanceof Error ? error.message : "Highlight some text in the frontmost app and try again",
    });
    return;
  }

  const trimmed = selected.trim();
  if (trimmed.length === 0) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Selected text is empty",
    });
    return;
  }

  let items: string[];
  let cleanup: (() => void) | undefined;

  if (isHttpUrl(trimmed)) {
    items = [trimmed];
  } else {
    const tmp = writeTempTextFile(selected, "selection.txt");
    items = [tmp.path];
    cleanup = tmp.cleanup;
  }

  await showHUD(`Sharing ${describeItems(items)} via AirDrop`);

  try {
    await airDropItems(items);
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "AirDrop failed",
      message: error instanceof Error ? error.message : String(error),
    });
  } finally {
    cleanup?.();
  }
}
