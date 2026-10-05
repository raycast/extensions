import { getPreferenceValues } from "@raycast/api";
import { setDefaultOutputDevice, setDefaultSystemDevice } from "./audio-device";

export async function setOutputAndSystemDevice(deviceId: string) {
  const { systemOutput } = getPreferenceValues();
  await setDefaultOutputDevice(deviceId);
  if (systemOutput) {
    await setDefaultSystemDevice(deviceId);
  }
}
