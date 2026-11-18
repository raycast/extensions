import { Color } from "@raycast/api";
import { type AudioDevice, TransportType } from "./audio-device";

function getDeviceIcon(device: AudioDevice): string | null {
  const name = device.name.toLowerCase();

  if (device.transportType === TransportType.Airplay) {
    return "airplay.png";
  }

  if (device.transportType === TransportType.Bluetooth || device.transportType === TransportType.BluetoothLowEnergy) {
    if (name.includes("airpods max")) {
      return "airpods-max.png";
    } else if (name.includes("airpods pro")) {
      return "airpods-pro.png";
    } else if (name.includes("airpods")) {
      return "airpods.png";
    }
    return "bluetooth-speaker.png";
  }

  if (device.transportType === TransportType.Headphones || device.transportType === "headphones") {
    return "headphones.png";
  }

  return null;
}

export function getIcon(device: AudioDevice, isCurrent: boolean) {
  const deviceIcon = getDeviceIcon(device);

  if (deviceIcon) {
    return {
      source: deviceIcon,
      tintColor: isCurrent ? Color.Green : Color.SecondaryText,
    };
  }

  return {
    source: device.isInput ? "mic.png" : "speaker.png",
    tintColor: isCurrent ? Color.Green : Color.SecondaryText,
  };
}
