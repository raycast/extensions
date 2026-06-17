import pangu from "pangu";
import { getSelectedText, Clipboard, showHUD } from "@raycast/api";

export default async () => {
  let text = "";
  try {
    text = await getSelectedText();
  } catch (e) {
    // ignored to use the content from clipboard
  } finally {
    if (text.trim() === "") {
      text = (await Clipboard.readText()) || "";
    }
  }
  const result = pangu.spacing(text);
  Clipboard.paste(result);

  await showHUD(`Formated using Pangu.👋`);
};
