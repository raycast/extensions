import { getPreferenceValues } from "@raycast/api";
import { runMirrorAction, MirrorDirection } from "./lib/mirror";

export default async function Command() {
  const { defaultToggleDirection } = getPreferenceValues<{ defaultToggleDirection: MirrorDirection }>();
  await runMirrorAction("toggle", defaultToggleDirection);
}
