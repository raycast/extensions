import { getPreferenceValues } from "@raycast/api";
import { DeviceList } from "./helpers";
import { AirPlaySelector } from "./airplay";

interface Context {
  deviceId?: string;
  deviceName?: string;
}

export default function Command({ launchContext }: { launchContext?: Context }) {
  const preferences = getPreferenceValues();

  return preferences.airplay ? (
    <AirPlaySelector />
  ) : (
    <DeviceList deviceId={launchContext?.deviceId} deviceName={launchContext?.deviceName} type="output" />
  );
}
