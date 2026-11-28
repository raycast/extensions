import { Color, Icon, List } from "@raycast/api";
import { listSystemIconFiles, systemIcon, systemIconSource } from "./device-icon-assets";
import type { IOType, VolumeInfo } from "./audio-device";
import {
  HIDDEN_ICON,
  MUTED_ICON,
  numberIconFile,
  ON_CONNECT_ICON,
  PIN_ICON,
  UNRANKED_ICON,
} from "./priority/icon-pool";
import type { ConnectMode } from "./priority/connect-mode";

const UNRANKED_TOOLTIP = "Priority not set: never selected automatically";
const ON_CONNECT_TOOLTIP = "Switch on Connect: becomes the current device when it connects";

/**
 * Tint for devices that are remembered but not connected, and for hidden devices. The Raycast API has no opacity option, so this is a
 * semi-transparent version of the secondary text color (alpha is an assumption that needs a visual check).
 */
export const DISCONNECTED_TINT: Color.Dynamic = {
  light: "rgba(60, 60, 67, 0.35)",
  dark: "rgba(235, 235, 245, 0.35)",
  adjustContrast: false,
};

/** Numbered circle icon (outline, filled for the current device); beyond 5, or without the files, a tag. */
function priorityAccessory(priority: number, isCurrent: boolean, dimmed = false): List.Item.Accessory {
  const color = dimmed ? DISCONNECTED_TINT : isCurrent ? Color.Green : Color.SecondaryText;
  const tooltip = `Priority ${priority} (1 is highest)`;
  const file = numberIconFile(priority, isCurrent, listSystemIconFiles());
  return file
    ? { icon: { source: systemIconSource(file), tintColor: color }, tooltip }
    : { tag: { value: `P${priority}`, color }, tooltip };
}

export function getDisconnectedAccessories(priority: number | undefined, isHidden: boolean, isShowingHidden: boolean) {
  const accessories: List.Item.Accessory[] = [];
  if (isHidden) {
    if (isShowingHidden) {
      accessories.push({ icon: systemIcon(HIDDEN_ICON, Icon.EyeDisabled, DISCONNECTED_TINT), tooltip: "Hidden" });
    }
  } else if (priority != null) {
    accessories.push(priorityAccessory(priority, false, true));
  }
  return accessories;
}

/**
 * Volume indicator. A pinned volume wraps the same indicator in a badge with a pin icon instead of adding one.
 * Dimmed for hidden devices, like devices that are not connected.
 */
function volumeAccessory(
  ioType: IOType,
  volumeInfo?: VolumeInfo,
  pinnedLevel?: number,
  dimmed = false,
): List.Item.Accessory | undefined {
  const secondary = dimmed ? DISCONNECTED_TINT : Color.SecondaryText;
  const percent = volumeInfo?.volume != null ? `${Math.round(volumeInfo.volume * 100)}%` : undefined;

  if (pinnedLevel != null) {
    // The tag API has no icon of its own, so the pin icon is the accessory's icon, shown next to the badge.
    return {
      icon: systemIcon(PIN_ICON, Icon.Pin, dimmed ? DISCONNECTED_TINT : Color.Orange),
      tag: {
        value: volumeInfo?.muted ? "Muted" : (percent ?? `${pinnedLevel}%`),
        color: dimmed ? DISCONNECTED_TINT : Color.Orange,
      },
      tooltip: `Volume pinned at ${pinnedLevel}% — enforced automatically`,
    };
  }
  if (!volumeInfo) return undefined;
  if (volumeInfo.muted) {
    return { icon: systemIcon(MUTED_ICON[ioType], Icon.SpeakerOff, secondary), tooltip: "Muted" };
  }
  // Text accessories only take a fixed Color (no custom tint), so hidden devices use the secondary text colour.
  const text = percent ?? "Volume controlled by device";
  return { text: dimmed ? { value: text, color: Color.SecondaryText } : text, tooltip: percent ? "Volume" : undefined };
}

/**
 * Order matters: accessories render left to right, so the priority (or "no priority") icon comes last, at the far
 * right (a bolt for "Switch on Connect"). A hidden device cannot have a priority, so it shows the hidden icon there
 * instead.
 */
export function getAccessories({
  ioType,
  isHidden,
  priority,
  isCurrent,
  isShowingHidden,
  volume: volumeInfo,
  pinnedLevel,
  connectMode,
}: {
  ioType: IOType;
  isHidden: boolean;
  priority?: number;
  isCurrent: boolean;
  isShowingHidden: boolean;
  volume?: VolumeInfo;
  pinnedLevel?: number;
  connectMode: ConnectMode;
}) {
  const accessories: List.Item.Accessory[] = [];

  const volume = volumeAccessory(ioType, volumeInfo, pinnedLevel, isHidden);
  if (volume) accessories.push(volume);

  if (isHidden) {
    if (isShowingHidden) {
      accessories.push({ icon: systemIcon(HIDDEN_ICON, Icon.EyeDisabled, DISCONNECTED_TINT), tooltip: "Hidden" });
    }
    return accessories;
  }

  if (priority != null) {
    accessories.push(priorityAccessory(priority, isCurrent));
  } else if (connectMode === "switch") {
    const file = isCurrent ? ON_CONNECT_ICON.filled : ON_CONNECT_ICON.outline;
    accessories.push({
      icon: systemIcon(file, Icon.Bolt, isCurrent ? Color.Green : Color.SecondaryText),
      tooltip: ON_CONNECT_TOOLTIP,
    });
  } else {
    accessories.push({ icon: systemIcon(UNRANKED_ICON, Icon.Circle, Color.SecondaryText), tooltip: UNRANKED_TOOLTIP });
  }
  return accessories;
}
