import { Color, Icon, type Image } from "@raycast/api";
import type { Target } from "./meross";

/** The device accepts on/off commands. */
export function canSwitch(target: Target) {
  return target.online && target.mode !== "unsupported";
}

/** Toggling needs the current state; if reading it failed, only explicit on/off is safe. */
export function canToggle(target: Target) {
  return canSwitch(target) && target.on !== undefined;
}

export function stateLabel(target: Target) {
  if (!target.online) return "Offline";
  if (target.mode === "unsupported") return "Unsupported";
  if (target.on === undefined) return "Unknown";
  return target.on ? "On" : "Off";
}

export function stateIcon(target: Target): Image.ImageLike {
  if (!target.online) return { source: Icon.WifiDisabled, tintColor: Color.SecondaryText };
  if (target.on) return { source: Icon.Plug, tintColor: Color.Green };
  return { source: Icon.Plug, tintColor: Color.SecondaryText };
}

/** Returns targets with the switch applied; channel 0 of a power strip switches all of its outlets. */
export function applyPower(targets: Target[], switched: Target, on: boolean): Target[] {
  return targets.map((t) =>
    t.id === switched.id || (t.uuid === switched.uuid && switched.channel === 0) ? { ...t, on } : t,
  );
}
