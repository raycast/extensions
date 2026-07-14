import { Color } from "@raycast/api";

export type DeviceKind = "headset" | "mobile" | "accessory" | "host" | "Mac";
export type DeviceDistance = "unknown" | "immediate" | "near" | "far";
export type DeviceSource = "local" | "nearby host" | "cloud";
export type AudioState = "idle" | "listening" | "call" | "microphone in use";
export type ListeningMode = "normal" | "noise cancellation" | "transparency" | "adaptive";
export type SpatialAudioMode = "off" | "fixed" | "head tracked";
export type BatteryPosition = "main" | "combined buds" | "left bud" | "right bud" | "charging case";
export type ChargingState = "discharging" | "charging" | "AC power" | "smart charging";
export type BatteryAlertKind = "low battery" | "charged";

export interface Battery {
  position: BatteryPosition;
  level: number;
  chargingState: ChargingState;
  low: boolean;
  unreliable: boolean;
}

export interface BatteryAlert {
  kind: BatteryAlertKind;
  position: BatteryPosition;
  threshold: number;
  enabled: boolean;
}

export interface Device {
  id: string;
  name: string;
  kind: DeviceKind;
  model: string;
  brand: string;
  address: string;
  connected: boolean;
  nearby: boolean;
  distance: DeviceDistance;
  source: DeviceSource;
  audioState: AudioState;
  inputRoute: boolean;
  outputRoute: boolean;
  /**
   * DO NOT READ THIS DIRECTLY. AirBuddy answers `listening mode` for every device,
   * including devices with no speakers — a Magic Trackpad reports "transparency".
   * Always gate on `supportsListeningMode(device)` first. See spec constraint 3.
   */
  listeningMode: ListeningMode;
  supportedListeningModes: ListeningMode[];
  leftBudInEar: boolean;
  rightBudInEar: boolean;
  anyBudInEar: boolean;
  anyBudInCase: boolean;
  caseLidClosed: boolean;
  batteries: Battery[];
  alerts: BatteryAlert[];
}

export interface AppState {
  spatialAudioMode: SpatialAudioMode;
  currentOutputName: string | null;
  currentInputName: string | null;
  nearestHeadsetName: string | null;
  favoriteHeadsetName: string | null;
}

/**
 * The ONLY sanctioned way to ask whether a device has listening modes.
 * A trackpad reports listeningMode: "transparency" with supportedListeningModes: [].
 */
export function supportsListeningMode(device: Device): boolean {
  return device.supportedListeningModes.length > 0;
}

/**
 * Whether connect/disconnect means anything for this device.
 *
 * **`connect device` is HEADSET-ONLY.** The sdef says so outright: "Connects to a specific *headset*
 * device." AirBuddy accepts it for anything else, returns exit 0, and silently does nothing — its
 * binary carries no "not a headset" error, so there is no way for it to tell us we're wrong.
 *
 * An earlier version only excluded `kind: "host"` (this Mac, which reports a meaningless
 * `connected: false`). That was too narrow: it left "Disconnect" as the primary ↵ action on a
 * keyboard, a trackpad, and an iPhone. Pressing it would spin for the full poll timeout and then
 * report a failure for a command AirBuddy never intended to honour.
 */
export function isConnectable(device: Device): boolean {
  return device.kind === "headset";
}

/**
 * Whether Spatial Audio can be toggled *from this device's row*.
 *
 * Spatial Audio is an **application**-level property in AirBuddy's API — the sdef puts it on
 * `application`, described as "the current Spatial Audio mode for **the output route**." The command
 * always acts on whatever device currently owns the output route, regardless of what you pass it.
 *
 * So the action is only honest on the device that IS the output route. Offering it on any other
 * headset produces a green "Spatial Audio: Fixed" toast on a row the command never touched — a
 * lying success toast, which is the whole class of defect this design exists to defeat.
 *
 * (`inputRoute` is deliberately NOT part of this: a microphone-only route cannot receive a
 * spatial-audio change.)
 */
export function isAudioDevice(device: Device): boolean {
  return device.outputRoute;
}

/** The battery to show as the headline number. Headsets report combined buds; everything else, main. */
export function primaryBattery(device: Device): Battery | undefined {
  return (
    device.batteries.find((b) => b.position === "combined buds") ?? device.batteries.find((b) => b.position === "main")
  );
}

export function caseBattery(device: Device): Battery | undefined {
  return device.batteries.find((b) => b.position === "charging case");
}

/** Show left/right separately only when they meaningfully differ. AirBuddy shows one number otherwise. */
export function budsDiverge(device: Device): boolean {
  const left = device.batteries.find((b) => b.position === "left bud");
  const right = device.batteries.find((b) => b.position === "right bud");
  if (!left || !right) return false;
  return Math.abs(left.level - right.level) >= 5;
}

/**
 * Section titles mirror AirBuddy's own Devices panel.
 *
 * The `default` matters: `DeviceKind` is hand-mirrored from AirBuddy's sdef and the JXA payload is
 * cast rather than validated, so a kind AirBuddy adds tomorrow reaches this function at runtime with
 * no compile error. Without the fallback it would return `undefined`, and the list — which groups by
 * this value and renders only known section titles — would drop the device entirely, with no error
 * anywhere. A visible "Other Devices" section is strictly better than a device that vanishes.
 */
export function sectionFor(device: Device): string {
  switch (device.kind) {
    case "headset":
      return "AirPods";
    case "host":
    case "Mac":
      return "Macs";
    case "mobile":
      return "iPhones, iPads, and Apple Watch";
    case "accessory":
      return "Keyboards, Mice, and Other Peripherals";
    default:
      return OTHER_SECTION;
  }
}

/** Fallback section for a device kind AirBuddy adds that we don't know about yet. */
export const OTHER_SECTION = "Other Devices";

/**
 * Device icons are SF Symbols, rendered to `assets/devices/` by `scripts/render-icons.swift`.
 *
 * Raycast's built-in `Icon` enum can't tell these devices apart: `Icon.Keyboard` renders as a robot
 * face at 16px, `Icon.Mouse` is a featureless rounded rectangle, and an Apple Watch and an iPhone
 * both report `kind: "mobile"` — with no watch glyph in the enum, they drew the IDENTICAL icon.
 *
 * AirBuddy itself draws its device glyphs with SF Symbols at runtime (its Assets.car ships no device
 * art — verified), so this matches the app we're a companion to.
 *
 * Discrimination uses `model` where `kind` is too coarse. Real values observed on live hardware:
 *   Mac15,8 (MacBook Pro) · V54AP (iPhone board id) · AirPodsPro1,3 · Device1,671 · Device1,804
 */
function deviceAsset(basename: string): { source: { light: string; dark: string } } {
  return {
    source: {
      light: `devices/${basename}.png`,
      dark: `devices/${basename}@dark.png`,
    },
  };
}

function assetNameFor(device: Device): string {
  const name = device.name.toLowerCase();
  const model = device.model.toLowerCase();
  const brand = device.brand.toLowerCase();

  switch (device.kind) {
    case "headset":
      // Brand FIRST. A "Beats Studio Pro" would otherwise match the `pro` branch below and get an
      // AirPods glyph — the beats branch was unreachable for any Beats model with "Pro" in its name.
      if (brand.includes("beats") || /beats/.test(model) || /beats/.test(name)) return "beats";

      // Then MODEL, which AirBuddy sets (AirPodsPro1,3) — not the user-editable name. Matching
      // `/max/` against the name meant a headset called "Max's AirPods" rendered as AirPods Max.
      if (/airpodsmax/.test(model)) return "airpods-max";
      if (/airpodspro/.test(model)) return "airpods-pro";
      if (/airpod/.test(model)) return "airpods";

      // Name is the last resort, and only on unambiguous whole words.
      if (/\bairpods max\b/.test(name)) return "airpods-max";
      if (/\bairpods pro\b/.test(name)) return "airpods-pro";
      if (/\bairpods\b/.test(name)) return "airpods";
      return "headphones";

    case "host":
    case "Mac":
      // MacBooks report MacBookPro*/MacBookAir*/Mac*,* — a laptop is the safe default for a Mac
      // that AirBuddy sees over Bluetooth, but honour an explicit desktop when we can tell.
      if (/imac|macmini|macpro|macstudio/.test(model) || /imac|mini|studio|pro display/.test(name)) {
        return "mac-desktop";
      }
      return "mac-laptop";

    case "mobile":
      // The case Raycast's enum could not express: AirBuddy reports Watch AND iPhone as "mobile".
      if (/watch/.test(model) || /watch/.test(name)) return "watch";
      if (/ipad/.test(model) || /ipad/.test(name)) return "ipad";
      return "iphone";

    case "accessory":
      if (/keyboard/.test(name)) return "keyboard";
      if (/trackpad/.test(name)) return "trackpad";
      if (/mouse/.test(name)) return "mouse";
      if (/speaker|homepod/.test(name)) return "speaker";
      if (/display|monitor/.test(name)) return "display";
      return "keyboard";

    default:
      // `DeviceKind` is hand-mirrored from AirBuddy's sdef and the JXA payload is cast, not
      // validated — a kind AirBuddy adds tomorrow arrives at runtime with no compile error.
      return "headphones";
  }
}

export function iconFor(device: Device): { source: { light: string; dark: string } } {
  return deviceAsset(assetNameFor(device));
}

/**
 * A battery glyph that FILLS by charge, the way AirBuddy's own menu bar draws it.
 *
 * Raycast's `Icon.Battery` is a single static outline at every level, so a 5% battery and a 100%
 * battery drew the identical shape — the number was the only signal. SF Symbols ships
 * battery.0/25/50/75/100percent, so the icon itself now carries the reading.
 */
export function batteryIcon(battery: Battery): { source: { light: string; dark: string } } {
  if (battery.chargingState !== "discharging") return deviceAsset("battery-charging");

  const level = battery.level;
  if (level >= 80) return deviceAsset("battery-100");
  if (level >= 55) return deviceAsset("battery-75");
  if (level >= 30) return deviceAsset("battery-50");
  if (level >= 10) return deviceAsset("battery-25");
  return deviceAsset("battery-0");
}

/**
 * Listening-mode glyphs, matching the ones AirBuddy draws in its own Noise Control menu: Off is a
 * plain person, Noise Cancellation a person enclosed, Transparency a person open to their
 * surroundings, Adaptive a person with a sparkle.
 */
export function listeningModeIcon(mode: ListeningMode): { source: { light: string; dark: string } } {
  switch (mode) {
    case "noise cancellation":
      return deviceAsset("mode-anc");
    case "transparency":
      return deviceAsset("mode-transparency");
    case "adaptive":
      return deviceAsset("mode-adaptive");
    case "normal":
    default:
      return deviceAsset("mode-off");
  }
}

/**
 * Spelled out, never abbreviated — AirBuddy's own menu says "Noise Cancellation", not "ANC".
 *
 * ONE source of truth. This map was previously copy-pasted into three files, which is precisely how
 * the "ANC" abbreviation survived in one of them after being removed from another.
 */
export const LISTENING_MODE_LABELS: Record<ListeningMode, string> = {
  normal: "Off",
  "noise cancellation": "Noise Cancellation",
  transparency: "Transparency",
  adaptive: "Adaptive",
};

/** Spatial Audio labels, phrased as toast titles ("what it is now"). */
export const SPATIAL_AUDIO_LABELS: Record<SpatialAudioMode, string> = {
  off: "Spatial Audio Off",
  fixed: "Spatial Audio: Fixed",
  "head tracked": "Spatial Audio: Head Tracked",
};

export function batteryColor(battery: Battery): Color {
  if (battery.level < 20) return Color.Red;
  if (battery.level < 40) return Color.Orange;
  return Color.SecondaryText;
}
