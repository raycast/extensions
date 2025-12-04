import { getPreferenceValues } from "@raycast/api";
import { moveTo } from "./common";

export default async function moveToStand() {
  const preferences = getPreferenceValues<Preferences>();
  const { standHeight } = preferences;
  await moveTo(+standHeight * 10);
}
