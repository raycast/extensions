import { getSelectedText, showToast, Toast, Clipboard } from "@raycast/api";
import { title } from "process";

export default async function Command() {
  try {
    const selectedText = await getSelectedText();
    //selectedText = paper
    // ||p
    // p||||e
    // r||
    //||||
    Clipboard.paste(sandwichCharacters(selectedText));
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Can't transform text",
      message: String(error),
    });
  }

  function sandwichCharacters(str: string): string {
    return `||${str.split("").join("||||")}||`;
  }
}
