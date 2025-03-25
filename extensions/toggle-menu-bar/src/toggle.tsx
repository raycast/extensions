import { getPreferenceValues, closeMainWindow } from "@raycast/api";
import { runToggleScript } from "./scriptRunner";

interface Preferences {
  closeWindow: boolean;
  optionOne: string;
  optionTwo: string;
}

export default async function toggleHandler() {
  const { closeWindow, optionOne, optionTwo } = getPreferenceValues<Preferences>();

  if (closeWindow) await closeMainWindow();
  await runToggleScript(optionOne, optionTwo);
}
