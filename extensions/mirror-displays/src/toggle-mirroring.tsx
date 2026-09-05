import { getPreferenceValues } from "@raycast/api";
import { runMirrorAction } from "./lib/mirror";

export default async function Command() {
  const { defaultToggleDirection } = getPreferenceValues<Preferences>();
  await runMirrorAction("toggle", defaultToggleDirection);
}
