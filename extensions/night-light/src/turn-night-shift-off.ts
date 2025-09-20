import { nightlight } from "./utils";
import { closeMainWindow, getPreferenceValues } from "@raycast/api";

export default async function main() {
  if (getPreferenceValues<Preferences>().closeWindow) await closeMainWindow();

  await nightlight("off", "Turned night shift off");
}
