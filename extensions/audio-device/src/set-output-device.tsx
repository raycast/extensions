import { getPreferenceValues } from "@raycast/api";
import { DeviceList } from "./helpers";
import { AirPlaySelector } from "./airplay";

export default function Command() {
  const preferences = getPreferenceValues();
  return preferences.airplay ? <AirPlaySelector /> : <DeviceList type="output" />;
}
