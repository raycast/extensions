import { closeMainWindow, getSelectedText } from "@raycast/api";
import { say } from "mac-say";
import { getSaySettings, parseSaySettings } from "./utils.js";

export default async function SelectionToSay() {
  await closeMainWindow();
  const { keepSilentOnError, ...saySettings } = parseSaySettings(getSaySettings());
  try {
    const selectedText = await getSelectedText();
    await say(selectedText, saySettings);
  } catch (error) {
    if (keepSilentOnError) return;
    await say(String(error), saySettings);
  }
}
