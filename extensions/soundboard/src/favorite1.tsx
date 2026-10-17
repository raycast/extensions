import { closeMainWindow, getPreferenceValues } from "@raycast/api";
import { playSoundFromIndex } from "./utils";

export default async function Main() {
  const { closeOnTrigger } = getPreferenceValues();

  if (closeOnTrigger) {
    await closeMainWindow();
  }
  await playSoundFromIndex(1);
}
