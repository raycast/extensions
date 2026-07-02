import { Color, Icon, List } from "@raycast/api";
import { type AudioDevice, isWindows } from "./audio-device";

export type VolumeInfo = { volume: number | undefined; muted: boolean | undefined };

function getWindowsTransportLabel(device: AudioDevice): string {
  if (!device.transportType) return "";

  const typeLabels: Record<string, string> = {
    hdmi: "HDMI Output",
    displayport: "DisplayPort",
    usb: "USB Audio",
    bluetooth: "Bluetooth",
    headphones: "Headphones",
    headset: "Headset",
    microphone: "Microphone",
    mic: "Microphone",
    speakers: "Speakers",
    speaker: "Speakers",
    spdif: "Digital (SPDIF/Optical)",
    virtual: "Virtual Device",
    builtin: "Built-in Audio",
  };

  const transportType = device.transportType.toLowerCase();
  return typeLabels[transportType] || device.transportType.charAt(0).toUpperCase() + device.transportType.slice(1);
}

export function getAccessories(
  isCurrent: boolean,
  isHidden: boolean,
  isDefault: boolean,
  shouldShowHidden: boolean,
  device?: AudioDevice,
  volumeInfo?: VolumeInfo,
  pinnedLevel?: number,
) {
  const accessories: List.Item.Accessory[] = [];

  if (volumeInfo) {
    if (volumeInfo.muted) {
      accessories.push({ icon: Icon.SpeakerOff, tooltip: "Muted" });
    } else if (volumeInfo.volume != null) {
      accessories.push({ text: `${Math.round(volumeInfo.volume * 100)}%`, tooltip: "Volume" });
    } else {
      accessories.push({ text: "Volume controlled by device" });
    }
  }

  if (pinnedLevel != null) {
    accessories.push({
      tag: { value: `Pinned: ${pinnedLevel}%`, color: Color.Orange },
      tooltip: "Volume pinned — enforced automatically",
    });
  }

  if (isDefault) {
    accessories.push({ tag: { value: "Default", color: Color.Blue }, tooltip: "Default device (auto-switch target)" });
  }

  if (isCurrent) {
    accessories.push({ icon: Icon.Checkmark });
  }

  if (shouldShowHidden && isHidden) {
    accessories.push({ icon: Icon.EyeDisabled, tooltip: "Hidden" });
  }

  if (isWindows && device?.isCommunication && !isCurrent) {
    accessories.push({ icon: Icon.Phone, tooltip: "Communication Device" });
  }

  if (isWindows && device && !isCurrent) {
    const deviceType = getWindowsTransportLabel(device);
    if (deviceType) {
      accessories.push({ text: deviceType });
    }
  }

  return accessories;
}
