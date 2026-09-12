import { getPreferenceValues } from "@raycast/api";
import { moveTo } from "./common";

export default async function moveToSit() {
  const preferences = getPreferenceValues<Preferences>();
  const { sitHeight } = preferences;
  await moveTo(+sitHeight * 10);
}
