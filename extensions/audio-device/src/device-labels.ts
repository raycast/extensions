import type { AudioDevice } from "./audio-device";
import { TransportType } from "./audio-device";

export function getTransportTypeLabel(device: AudioDevice) {
  return Object.entries(TransportType).find(([, value]) => value === device.transportType)?.[0];
}
