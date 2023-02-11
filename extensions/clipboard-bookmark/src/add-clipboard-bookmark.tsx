import { Clipboard, closeMainWindow, LocalStorage, PopToRootType, showHUD, showToast, Toast } from "@raycast/api";
import { v4 as uuidv4 } from "uuid";

export default async function AddClipboardBookmark() {
  const { text } = await Clipboard.read();
  if (!text || text.trim() === "") {
    await showHUD("Text clipboard is empty");
  } else {
    try {
      await LocalStorage.setItem(
        uuidv4(),
        JSON.stringify({
          title: text,
          text,
        })
      );
      await showHUD("Added to bookmarks");
      await closeMainWindow({ popToRootType: PopToRootType.Suspended });
    } catch (e) {
      const error = e as Error;
      await showToast({
        style: Toast.Style.Failure,
        title: "Fail to save your bookmark",
        message: error.message,
      });
    }
  }
}
