import { closeMainWindow, getSelectedText } from "@raycast/api";
import { say } from "mac-say";
import { getSaySettings, parseSaySettings } from "./utils.js";

export default async function SelectionToSay() {
  const selectedText = await getSelectedText();
  const saySettings = parseSaySettings(getSaySettings());
  await closeMainWindow();
  await say(selectedText, saySettings);
}
