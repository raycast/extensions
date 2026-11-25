import { Color, Icon } from "@raycast/api";

export const hex4 = (n?: number) => (n === undefined ? "—" : "0x" + n.toString(16).padStart(4, "0"));
export const hex2 = (n?: number) => (n === undefined ? "??" : n.toString(16).padStart(2, "0"));

/** BCD version (bcdUSB / bcdDevice) → "3.2" / "1.03". */
export function bcdToString(bcd?: number, trimMinor = true): string | undefined {
  if (bcd === undefined) return undefined;
  const major = (bcd >> 8) & 0xff;
  const minor = (bcd >> 4) & 0xf;
  const sub = bcd & 0xf;
  if (trimMinor) return sub ? `${major}.${minor}.${sub}` : `${major}.${minor}`;
  return `${major}.${minor}${sub}`;
}

/** Any hex works for tags; Raycast adjusts it for contrast in light and dark themes. */
const hex = (h: string): Color.Dynamic => ({ light: h, dark: h, adjustContrast: true });

/**
 * Pale, stable colour for open-ended labels (driver names): hue from a hash of the text, fixed low
 * saturation / high lightness, so the same driver is always the same tint and the list never runs out.
 */
export function paleFor(text: string): Color.Dynamic {
  // FNV-1a spreads similar names ("AppleUSB…") across the wheel far better than a simple *31 hash.
  let h = 0x811c9dc5;
  for (const ch of text) h = Math.imul(h ^ ch.charCodeAt(0), 0x01000193) >>> 0;
  const hue = h % 360;
  const f = (n: number) => {
    const k = (n + hue / 30) % 12;
    const a = 0.45 * Math.min(0.8, 1 - 0.8);
    return Math.round(255 * (0.8 - a * Math.max(-1, Math.min(k - 3, 9 - k, 1))))
      .toString(16)
      .padStart(2, "0");
  };
  return hex(`#${f(0)}${f(8)}${f(4)}`);
}

/** Pale version of a type colour (mixed 55% with white), for interfaces that map to a known type. */
export function paleOf(c: Color.ColorLike): Color.ColorLike {
  const raw = typeof c === "object" && "dark" in c ? String(c.dark) : undefined;
  if (!raw?.startsWith("#")) return c;
  const mix = (i: number) =>
    Math.round(parseInt(raw.slice(i, i + 2), 16) * 0.45 + 255 * 0.55)
      .toString(16)
      .padStart(2, "0");
  return hex(`#${mix(1)}${mix(3)}${mix(5)}`);
}

/**
 * Connector-plastic colours by USB version. Only USB 3 blue (Pantone 300 C) is in the spec; teal for
 * 3.1/3.2 (10 Gb/s) is a manufacturer convention; USB 1/2 ports are white or black → primary text.
 * USB4 has no plastic convention (Type-C only), so it stays primary too.
 */
export function usbVersionColor(bcd: number): Color.ColorLike {
  const major = (bcd >> 8) & 0xff;
  const minor = (bcd >> 4) & 0xf;
  if (major === 3) return minor === 0 ? hex("#005EB8") : hex("#00A3AD");
  return Color.PrimaryText;
}

// ---------- Link speed ----------

export interface SpeedInfo {
  code: number;
  rate: string;
  color: Color.ColorLike;
}

const SPEEDS: SpeedInfo[] = [
  { code: 0, rate: "1.5 Mb/s", color: Color.SecondaryText },
  { code: 1, rate: "12 Mb/s", color: Color.SecondaryText },
  { code: 2, rate: "480 Mb/s", color: hex("#A9B4C2") },
  { code: 3, rate: "5 Gb/s", color: hex("#32D74B") },
  { code: 4, rate: "10 Gb/s", color: hex("#40C8E0") },
  { code: 5, rate: "20 Gb/s", color: hex("#BF5AF2") },
];

/** Accepts the ioreg speed enum (0–5) or a link rate in bits/s. */
export function speedFrom(code?: number, linkBps?: number): SpeedInfo | undefined {
  if (linkBps && linkBps > 0) {
    const mbps = linkBps / 1e6;
    if (mbps <= 2) return SPEEDS[0];
    if (mbps <= 20) return SPEEDS[1];
    if (mbps <= 600) return SPEEDS[2];
    if (mbps <= 6000) return SPEEDS[3];
    if (mbps <= 12000) return SPEEDS[4];
    return SPEEDS[5];
  }
  if (code === undefined) return undefined;
  return SPEEDS[code];
}

/** Tidy device names for the narrow list column (full name stays in the detail pane). */
export function prettyName(name: string): string {
  let n = name.trim();
  // Realtek-style "USB 10_100_1G_2_5G LAN" → "10/100/1G/2.5G LAN"
  n = n.replace(/(\d)_(\d)G\b/g, "$1.$2G").replace(/(\w)_(?=\w)/g, "$1/");
  // Drop a leading "USB " only when at least two words remain ("USB Serial" stays as is).
  n = n.replace(/^USB[\s-]+(?=\S+\s+\S)/i, "");
  return n.replace(/\s{2,}/g, " ");
}

// ---------- Classes ----------

export const CLASS_NAMES: Record<number, string> = {
  0x00: "Per-interface",
  0x01: "Audio",
  0x02: "Communications (CDC)",
  0x03: "HID",
  0x05: "Physical",
  0x06: "Still Image",
  0x07: "Printer",
  0x08: "Mass Storage",
  0x09: "Hub",
  0x0a: "CDC Data",
  0x0b: "Smart Card",
  0x0d: "Content Security",
  0x0e: "Video",
  0x0f: "Personal Healthcare",
  0x10: "Audio/Video",
  0x11: "Billboard",
  0x12: "Type-C Bridge",
  0x3c: "I3C",
  0xdc: "Diagnostic",
  0xe0: "Wireless Controller",
  0xef: "Miscellaneous",
  0xfe: "Application Specific",
  0xff: "Vendor Specific",
};

/** Short human label for one interface (class/subclass/protocol). */
export function interfaceLabel(cls?: number, sub?: number, proto?: number): string {
  if (cls === undefined) return "Unknown";
  switch (cls) {
    case 0x01:
      return sub === 1 ? "Audio Control" : sub === 2 ? "Audio Stream" : sub === 3 ? "MIDI" : "Audio";
    case 0x02:
      return sub === 2 ? "Serial (ACM)" : sub === 6 ? "Ethernet (ECM)" : sub === 0x0d ? "Ethernet (NCM)" : "CDC";
    case 0x03:
      return proto === 1 ? "Keyboard" : proto === 2 ? "Mouse" : "HID";
    case 0x08:
      return proto === 0x62 ? "Storage (UAS)" : "Storage";
    case 0x0e:
      return sub === 1 ? "Video Control" : sub === 2 ? "Video Stream" : "Video";
    case 0xe0:
      return sub === 1 && proto === 1 ? "Bluetooth" : "Wireless";
    case 0xfe:
      return sub === 1
        ? proto === 2
          ? "DFU (bootloader)"
          : "DFU (firmware update)"
        : sub === 3
          ? "Test & Measurement"
          : "App Specific";
    case 0xff:
      return "Vendor";
    default:
      return CLASS_NAMES[cls] ?? `Class 0x${hex2(cls)}`;
  }
}

// ---------- Categories (the glanceable "what is it" tags) ----------

export type Category =
  | "Audio"
  | "MIDI"
  | "Keyboard"
  | "Mouse"
  | "HID"
  | "Game Controller"
  | "Media Keys"
  | "Drawing Tablet"
  | "Display"
  | "Storage"
  | "Hub"
  | "Hub Controller"
  | "Camera"
  | "Serial"
  | "Network"
  | "Bluetooth"
  | "Printer"
  | "Security Key"
  | "Bootloader"
  | "Phone / Tablet"
  | "Card Reader"
  | "Wireless Receiver"
  | "Control Surface"
  | "Vendor";

export const CATEGORY_STYLE: Record<Category, { icon: Icon; color: Color.ColorLike }> = {
  Audio: { icon: Icon.Speaker, color: hex("#FF9F0A") },
  MIDI: { icon: Icon.Music, color: hex("#FF6482") },
  Keyboard: { icon: Icon.Keyboard, color: hex("#0A84FF") },
  Mouse: { icon: Icon.Mouse, color: hex("#64D2FF") },
  HID: { icon: Icon.Fingerprint, color: hex("#F78FB3") },
  "Game Controller": { icon: Icon.GameController, color: hex("#5E5CE6") },
  "Drawing Tablet": { icon: Icon.Pencil, color: hex("#C7A6FF") },
  "Media Keys": { icon: Icon.Calculator, color: hex("#3D8BD9") },
  Display: { icon: Icon.Monitor, color: hex("#FFB86B") },
  Storage: { icon: Icon.HardDrive, color: hex("#30D158") },
  Hub: { icon: Icon.Box, color: hex("#E8A87C") },
  "Hub Controller": { icon: Icon.Cog, color: hex("#D98CB3") },
  Camera: { icon: Icon.Camera, color: hex("#FF453A") },
  Serial: { icon: Icon.Terminal, color: hex("#FFD60A") },
  Network: { icon: Icon.Network, color: hex("#AC8E68") },
  Bluetooth: { icon: Icon.Bluetooth, color: hex("#3478F6") },
  Printer: { icon: Icon.Print, color: hex("#A3B18A") },
  "Phone / Tablet": { icon: Icon.Mobile, color: hex("#BF5AF2") },
  "Card Reader": { icon: Icon.MemoryStick, color: hex("#A8E05F") },
  "Wireless Receiver": { icon: Icon.Signal3, color: hex("#7A9CFF") },
  "Control Surface": { icon: Icon.AppWindowGrid3x3, color: hex("#00C7BE") },
  "Security Key": { icon: Icon.Key, color: hex("#F5C26B") },
  Bootloader: { icon: Icon.Download, color: hex("#FF2D55") },
  Vendor: { icon: Icon.QuestionMarkCircle, color: hex("#E0C097") },
};

/** Order decides which category gives the row its icon. */
export const CATEGORY_PRIORITY: Category[] = [
  // A device sitting in its bootloader is "that" first, whatever it normally is.
  "Bootloader",
  "Phone / Tablet",
  // A gamepad usage page is unambiguous, and gamepads often carry an audio jack too.
  "Game Controller",
  "Control Surface",
  "Wireless Receiver",
  "MIDI",
  "Audio",
  "Card Reader",
  "Storage",
  "Camera",
  "Security Key",
  "Keyboard",
  "Mouse",
  "Drawing Tablet",
  "Serial",
  "Network",
  "Bluetooth",
  "Printer",
  "Media Keys",
  "Display",
  "HID",
  "Hub Controller",
  "Hub",
  "Vendor",
];

export function categoryForInterface(cls?: number, sub?: number, proto?: number): Category | undefined {
  switch (cls) {
    case 0x01:
      return sub === 3 ? "MIDI" : "Audio";
    case 0x02:
      return sub === 2 ? "Serial" : sub === 6 || sub === 0x0d ? "Network" : undefined;
    case 0x03:
      return proto === 1 ? "Keyboard" : proto === 2 ? "Mouse" : "HID";
    case 0x06:
      return "Camera"; // PTP: cameras (and phones) exposing photos for import
    case 0x07:
      return "Printer";
    case 0x08:
      return "Storage";
    case 0x09:
      return "Hub";
    case 0x0b:
      return "Security Key"; // CCID: smart-card readers and keys like YubiKey
    case 0x0e:
      return "Camera";
    case 0x11:
      return "Display"; // Billboard: USB-C display (Alt Mode) status
    case 0xe0:
      return sub === 1 && proto === 1 ? "Bluetooth" : undefined;
    case 0xfe:
      return sub === 1 && proto === 2 ? "Bootloader" : undefined;
    case 0xff:
      return "Vendor";
    default:
      return undefined;
  }
}

export const HID_SPECIFIC: Category[] = [
  "Control Surface",
  "Wireless Receiver",
  "Keyboard",
  "Mouse",
  "Game Controller",
  "Drawing Tablet",
  "Media Keys",
  "Display",
  "Security Key",
];

/** HID usage page/usage (from the HID driver) → category. Vendor pages return undefined. */
export function hidUsageCategory(page: number, usage: number): Category | undefined {
  if (page === 0x01) {
    if (usage === 0x06 || usage === 0x07) return "Keyboard";
    if (usage === 0x01 || usage === 0x02) return "Mouse";
    if (usage === 0x04 || usage === 0x05 || usage === 0x08) return "Game Controller";
    return undefined; // system control etc.
  }
  if (page === 0x0c) return "Media Keys";
  if (page === 0x0d) return "Drawing Tablet";
  if (page === 0x80 || page === 0x81 || page === 0x82) return "Display";
  if (page === 0xf1d0) return "Security Key";
  return undefined;
}

// ---------- Groups (sections in the "By Type" view) ----------

export const GROUPS: { title: string; categories: Category[] }[] = [
  { title: "Audio & MIDI", categories: ["MIDI", "Audio"] },
  { title: "Storage", categories: ["Storage", "Card Reader"] },
  {
    title: "Input",
    categories: [
      "Keyboard",
      "Mouse",
      "Game Controller",
      "Control Surface",
      "Wireless Receiver",
      "Drawing Tablet",
      "Media Keys",
      "HID",
    ],
  },
  { title: "Phones & Cameras", categories: ["Phone / Tablet", "Camera"] },
  { title: "Serial & Dev Boards", categories: ["Serial", "Bootloader"] },
  { title: "Network & Wireless", categories: ["Network", "Bluetooth"] },
  { title: "Security", categories: ["Security Key"] },
  { title: "Display & Monitor", categories: ["Display"] },
  { title: "Printers", categories: ["Printer"] },
  { title: "Other", categories: ["Vendor", "Hub"] },
];

export function groupFor(primary?: Category): string {
  return GROUPS.find((g) => primary && g.categories.includes(primary))?.title ?? "Other";
}

// ---------- USB-C / ACPI _UPC connector types ----------

export function connectorName(code?: number): string | undefined {
  if (code === undefined) return undefined;
  const map: Record<number, string> = {
    0x00: "Type-A",
    0x01: "Mini-AB",
    0x02: "ExpressCard",
    0x03: "USB 3 Type-A",
    0x04: "USB 3 Type-B",
    0x05: "USB 3 Micro-B",
    0x06: "USB 3 Micro-AB",
    0x07: "USB 3 Power-B",
    0x08: "Type-C (USB 2)",
    0x09: "Type-C",
    0x0a: "Type-C",
    0xff: "Internal",
  };
  return map[code];
}

// ---------- Vendor ID fallback table (used only when the device reports no vendor string) ----------

export const VENDORS: Record<number, string> = {
  0x03f0: "HP",
  0x0403: "FTDI",
  0x0424: "Microchip (SMSC)",
  0x045e: "Microsoft",
  0x046d: "Logitech",
  0x0483: "STMicroelectronics",
  0x048d: "ITE Tech",
  0x0499: "Yamaha",
  0x04b4: "Cypress",
  0x04d8: "Microchip",
  0x04e8: "Samsung",
  0x050d: "Belkin",
  0x054c: "Sony",
  0x0582: "Roland",
  0x05ac: "Apple",
  0x05e3: "Genesys Logic",
  0x0763: "M-Audio",
  0x0781: "SanDisk",
  0x07fd: "MOTU",
  0x08bb: "Texas Instruments (audio)",
  0x0944: "Korg",
  0x0951: "Kingston",
  0x09e8: "Akai Professional",
  0x0b05: "ASUS",
  0x0bc2: "Seagate",
  0x0bda: "Realtek",
  0x0d8c: "C-Media",
  0x0fd9: "Elgato",
  0x1050: "Yubico",
  0x1058: "Western Digital",
  0x10c4: "Silicon Labs",
  0x1235: "Focusrite / Novation",
  0x1397: "Behringer (Music Tribe)",
  0x14ed: "Shure",
  0x152d: "JMicron",
  0x1532: "Razer",
  0x1686: "Zoom",
  0x174c: "ASMedia",
  0x17cc: "Native Instruments",
  0x18d1: "Google",
  0x1915: "Nordic Semiconductor",
  0x1935: "Elektron",
  0x19f7: "RØDE",
  0x1a86: "WCH (CH340)",
  0x1b1c: "Corsair",
  0x1c75: "Arturia",
  0x1d50: "OpenMoko (open hardware)",
  0x1d6b: "Linux Foundation",
  0x1fc9: "NXP",
  0x2109: "VIA Labs",
  0x2341: "Arduino",
  0x2367: "Teenage Engineering",
  0x239a: "Adafruit",
  0x2516: "Cooler Master",
  0x2982: "Ableton",
  0x291a: "Anker",
  0x2a39: "RME",
  0x2b5a: "Universal Audio",
  0x2c97: "Ledger",
  0x2c99: "Prusa Research",
  0x2e8a: "Raspberry Pi",
  0x303a: "Espressif",
  0x3434: "Keychron",
  0x8087: "Intel",
  0xb58e: "Blue Microphones",
};

/** VID/PID pairs of popular USB-serial bridges, so they're tagged Serial even before a driver loads. */
export const SERIAL_BRIDGE_VIDS = new Set([0x0403, 0x10c4, 0x1a86, 0x067b]);
export const SECURITY_KEY_VIDS = new Set([0x1050, 0x2c97, 0x20a0, 0x096e]);
