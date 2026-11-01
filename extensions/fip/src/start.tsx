import { getPreferenceValues } from "@raycast/api";
import { startRadio } from "./playback";
import { radioByTitle } from "./radios";

export default async function Command() {
  const { defaultRadio } = getPreferenceValues<Preferences.Start>();
  await startRadio(radioByTitle(defaultRadio));
}
