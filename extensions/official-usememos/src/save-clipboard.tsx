import { Clipboard, showHUD } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { createMemo } from "./api/memo";
import { getDefaultVisibility, getMemosConnection } from "./helpers/preferences";

const SaveClipboardCommand = async () => {
  const text = (await Clipboard.readText())?.trim();
  if (text == null || text === "") {
    await showHUD("Clipboard has no text to save");
    return;
  }

  try {
    await createMemo(getMemosConnection(), { content: text, visibility: getDefaultVisibility() });
    await showHUD("Saved clipboard to Memos");
  } catch (error) {
    await showFailureToast(error, { title: "Couldn't save clipboard" });
  }
};

export default SaveClipboardCommand;
