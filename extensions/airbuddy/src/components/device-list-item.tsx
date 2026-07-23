import { Color, Icon, List } from "@raycast/api";
import type { ReactNode } from "react";
import {
  LISTENING_MODE_LABELS,
  type Device,
  batteryColor,
  batteryIcon,
  budsDiverge,
  caseBattery,
  iconFor,
  listeningModeIcon,
  primaryBattery,
  supportsListeningMode,
} from "../types";

/**
 * One row: icon · name · listening mode · battery.
 *
 * Deliberately NO subtitle. An earlier version carried "In ear · Output + Input · Near" under the
 * name, which meant the row showed three competing pieces of chrome where AirBuddy's own menu-bar row
 * shows one number. The in-ear and proximity state is real, but it isn't what you open this list to
 * find out — so it lives in tooltips now, not in the layout.
 *
 * The listening mode DOES earn its place: it's the one thing AirBuddy's row can't tell you at a
 * glance, and arguably the reason to reach for this extension instead of the menu bar.
 */
export function DeviceListItem({ device, actions }: { device: Device; actions: ReactNode }) {
  const accessories: List.Item.Accessory[] = [];

  // Listening mode — ONLY when the device actually supports one AND currently reports one.
  // AirBuddy 911 returns `listeningMode: null` for devices it doesn't apply to (fixed upstream;
  // a trackpad used to report the bogus value "transparency"). The `supportsListeningMode` gate
  // stays as belt-and-suspenders — both should now agree — but the explicit null-check is what
  // narrows the type for TS.
  if (supportsListeningMode(device) && device.listeningMode) {
    const mode = device.listeningMode;
    accessories.push({
      icon: listeningModeIcon(mode),
      tag: { value: LISTENING_MODE_LABELS[mode], color: Color.Purple },
      tooltip: `Listening mode: ${LISTENING_MODE_LABELS[mode]}`,
    });
  }

  const chargeCase = caseBattery(device);
  if (chargeCase) {
    accessories.push({
      icon: batteryIcon(chargeCase),
      text: { value: `${Math.round(chargeCase.level)}%`, color: batteryColor(chargeCase) },
      tooltip: `Charging case: ${Math.round(chargeCase.level)}%`,
    });
  }

  if (budsDiverge(device)) {
    const left = device.batteries.find((b) => b.position === "left bud");
    const right = device.batteries.find((b) => b.position === "right bud");
    if (left && right) {
      accessories.push({
        text: `L ${Math.round(left.level)}% · R ${Math.round(right.level)}%`,
        tooltip: "The earbuds are at different levels",
      });
    }
  }

  const primary = primaryBattery(device);
  if (primary) {
    accessories.push({
      icon: batteryIcon(primary),
      text: { value: `${Math.round(primary.level)}%`, color: batteryColor(primary) },
      tooltip: tooltipFor(device, primary.level, primary.chargingState, primary.unreliable),
    });
  }

  // Trailing-most, icon-only, muted — matching AirBuddy's own device list, which shows a gray pin
  // glyph on pinned rows and nothing at all on unpinned ones. No "unpinned" icon exists on purpose:
  // an accessory for the ABSENCE of a state is noise on every other row in the list.
  if (device.pinned) {
    accessories.push({ icon: { source: Icon.Geopin, tintColor: Color.SecondaryText }, tooltip: "Pinned" });
  }

  return <List.Item icon={iconFor(device)} title={device.name} accessories={accessories} actions={actions} />;
}

/**
 * The state that used to live in the subtitle now lives here — real information, but not worth a line
 * of layout on every row.
 */
function tooltipFor(device: Device, level: number, chargingState: string, unreliable: boolean): string {
  const parts: string[] = [`${Math.round(level)}% · ${chargingState}`];

  if (unreliable) parts.push("AirBuddy reports this reading as unreliable");

  if (device.kind === "headset") {
    if (device.anyBudInEar) parts.push("In ear");
    else if (device.anyBudInCase) parts.push("In case");

    if (device.outputRoute && device.inputRoute) parts.push("Output + Input");
    else if (device.outputRoute) parts.push("Output");
    else if (device.inputRoute) parts.push("Input");

    if (device.distance !== "unknown") {
      parts.push(device.distance.charAt(0).toUpperCase() + device.distance.slice(1));
    }
  }

  return parts.join(" · ");
}
