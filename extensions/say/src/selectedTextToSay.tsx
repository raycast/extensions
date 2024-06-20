import { closeMainWindow, getSelectedText } from "@raycast/api";
import { say } from "mac-say";
import { getSaySettings, parseSaySettings } from "./utils.js";

export default async function SelectionToSay() {
  await closeMainWindow();
  const selectedText = await getSelectedText().catch((error) => error.toString());
  const saySettings = parseSaySettings(getSaySettings());
  await say(selectedText, saySettings);
}
