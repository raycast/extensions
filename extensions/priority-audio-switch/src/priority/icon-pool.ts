// Pure helpers for the icons in assets/icons (Tabler Icons, MIT; copied by scripts/copy-icons.js).
// "name.svg" is the outline icon and "name-filled.svg" the filled one, used for the current device.
//
// - icons/system:  state icons the extension draws itself. Never offered in Customize Device.
// - icons/devices: the pool the user picks device icons from, and the automatic defaults.

export const SYSTEM_ICON_DIR = "icons/system";
export const DEVICE_ICON_DIR = "icons/devices";

const FILLED = "-filled";

export type PoolIcon = {
  /** Stable id stored in preferences: the base file name without ".svg" / "-filled.svg". */
  id: string;
  title: string;
  /** File names relative to the devices folder. */
  outline: string;
  filled: string;
};

// System icons (files in icons/system).
export const HIDDEN_ICON = "eye-off.svg";
export const UNRANKED_ICON = "circle-dashed.svg";
/** "Switch on Connect": outline, and filled for the current device (like the priority numbers). */
export const ON_CONNECT_ICON = { outline: "bolt.svg", filled: "bolt-filled.svg" } as const;
export const MUTED_ICON = { input: "microphone-off.svg", output: "volume-off.svg" } as const;
export const PIN_ICON = "pin.svg";
export const UNPIN_ICON = "pinned-off.svg";

/** Icons in the action panel and forms (also in icons/system). */
export const ACTION_ICON = {
  selectOutput: "volume.svg",
  selectInput: "microphone.svg",
  switchOnConnect: "bolt.svg",
  switchOnConnectOff: "bolt-off.svg",
  topPriority: "star.svg",
  raise: "arrow-up.svg",
  lower: "arrow-down.svg",
  setPriority: "list-numbers.svg",
  customize: "pencil.svg",
  defaultIcon: "wand.svg",
  show: "eye.svg",
  hide: "eye-off.svg",
  unmute: { input: "microphone.svg", output: "volume.svg" },
  mute: { input: "microphone-off.svg", output: "volume-off.svg" },
} as const;

/** The file when it exists among the system icons, otherwise undefined (callers fall back to built-in icons). */
export const stateIconFile = (file: string, files: string[]): string | undefined =>
  files.includes(file) ? file : undefined;

/** File for a numbered priority indicator (1–5 are provided), or undefined when it is not available. */
export function numberIconFile(n: number, filled: boolean, files: string[]): string | undefined {
  const file = `circle-number-${n}${filled ? FILLED : ""}.svg`;
  return files.includes(file) ? file : undefined;
}

/** Readable names for the pool. Anything not listed gets a title from its file name. */
const TITLES: Record<string, string> = {
  bluetooth: "Bluetooth",
  usb: "USB",
  "device-airpods": "Earbuds",
  "device-speaker": "Speaker",
  "device-laptop": "Laptop",
  "device-desktop": "Display",
  "devices-2": "Desktop",
  "device-imac": "All-in-One",
  "device-tv": "TV",
  "microphone-2": "Studio Microphone",
  volume: "Sound",
  cast: "Cast",
};

const titleOf = (id: string) =>
  TITLES[id] ??
  id
    .replace(/^device-/, "")
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

/** Pool from the files in the devices folder. */
export function buildIconPool(files: string[]): PoolIcon[] {
  const svgs = new Set(files.filter((f) => f.endsWith(".svg")));
  const ids = new Set<string>();
  for (const file of svgs) {
    const base = file.slice(0, -".svg".length);
    ids.add(base.endsWith(FILLED) ? base.slice(0, -FILLED.length) : base);
  }

  return [...ids]
    .map((id) => {
      const outline = svgs.has(`${id}.svg`) ? `${id}.svg` : `${id}${FILLED}.svg`;
      const filled = svgs.has(`${id}${FILLED}.svg`) ? `${id}${FILLED}.svg` : outline;
      return { id, title: titleOf(id), outline, filled };
    })
    .sort((a, b) => a.title.localeCompare(b.title));
}

export function findPoolIcon(pool: PoolIcon[], id: string | undefined): PoolIcon | undefined {
  return id ? pool.find((p) => p.id === id) : undefined;
}

export type IconDevice = { uid?: string; name?: string; transportType?: string };

/** The Mac itself, from the name macOS gives its built-in devices ("MacBook Pro Speakers", "iMac Microphone"). */
function macIcon(name = ""): string {
  if (/macbook/i.test(name)) return "device-laptop";
  if (/imac/i.test(name)) return "device-imac";
  return "devices-2"; // Mac mini, Mac Studio, Mac Pro
}

/** The headphone jack of the Mac: its own built-in device on Apple silicon. */
const isHeadphoneJack = (device: IconDevice) =>
  device.uid === "BuiltInHeadphoneOutputDevice" ||
  (device.transportType === "builtin" && /headphone|line out/i.test(device.name ?? ""));

/**
 * Pool icon chosen automatically from the device type and direction.
 * Output: Mac → laptop / all-in-one / desktop, headphone jack → speaker, USB → usb, Bluetooth → bluetooth,
 * AirPlay → cast, HDMI / DisplayPort → display, anything else → sound.
 * Input: the Mac's microphone → laptop / all-in-one / desktop, anything else → microphone.
 */
export function defaultIconId(device: IconDevice, direction: "input" | "output"): string {
  const transport = device.transportType;
  if (direction === "input") return transport === "builtin" ? macIcon(device.name) : "microphone";

  if (isHeadphoneJack(device)) return "device-speaker";
  switch (transport) {
    case "builtin":
      return macIcon(device.name);
    case "usb":
      return "usb";
    case "bluetooth":
    case "bluetoothle":
      return "bluetooth";
    case "airplay":
      return "cast";
    case "hdmi":
    case "displayport":
      return "device-desktop";
    default:
      return "volume";
  }
}

/** The icon to show: the one the user picked, else the automatic default, when it is in the pool. */
export function resolveDeviceIcon(
  pool: PoolIcon[],
  device: IconDevice,
  direction: "input" | "output",
  chosenId: string | undefined,
): PoolIcon | undefined {
  return findPoolIcon(pool, chosenId) ?? findPoolIcon(pool, defaultIconId(device, direction));
}
