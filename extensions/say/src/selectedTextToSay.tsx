import { closeMainWindow, getSelectedText } from "@raycast/api";
import { say } from "mac-say";
import { getParsedSaySettings } from "./utils.js";

export default async function SelectionToSay() {
  await closeMainWindow();
  const { keepSilentOnError, ...saySettings } = getParsedSaySettings();
  try {
    const selectedText = await getSelectedText();
    await say(selectedText, saySettings);
  } catch (error) {
    if (keepSilentOnError) return;
    await say(String(error), saySettings);
  }
}
