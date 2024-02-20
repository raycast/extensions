import { nightlight } from "./utils";
import { getPreferenceValues, closeMainWindow } from "@raycast/api";

export default async function main() {
  if (getPreferenceValues<Preferences>().closeWindow) await closeMainWindow();

  await nightlight("on", "Turned night shift on");
}
