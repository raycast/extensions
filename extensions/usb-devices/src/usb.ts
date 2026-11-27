import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { parsePlist } from "./plist-fast";
import {
  CATEGORY_PRIORITY,
  Category,
  HID_SPECIFIC,
  SECURITY_KEY_VIDS,
  SERIAL_BRIDGE_VIDS,
  VENDORS,
  categoryForInterface,
  connectorName,
  hex4,
  hidUsageCategory,
} from "./lookups";

const run = promisify(execFile);
const EXEC_OPTS = { maxBuffer: 128 * 1024 * 1024, timeout: 15_000 };

type Props = Record<string, unknown>;
type RegNode = Props & { IORegistryEntryChildren?: RegNode[] };

export interface UsbInterface {
  number?: number;
  classCode?: number;
  subClass?: number;
  protocol?: number;
  name?: string;
  drivers: string[];
}

export interface UsbVolume {
  bsd: string;
  name?: string;
  mountPoint?: string;
  content?: string;
  size?: number;
}

export interface UsbDisk {
  bsd: string;
  name?: string;
  size?: number;
  removable?: boolean;
  ejectable?: boolean;
  volumes: UsbVolume[];
}

export interface UsbDevice {
  key: string;
  name: string;
  vendor?: string;
  vendorFromTable: boolean;
  vendorId?: number;
  productId?: number;
  serial?: string;
  bcdUSB?: number;
  bcdDevice?: number;
  speedCode?: number;
  linkBps?: number;
  deviceClass?: number;
  deviceSubClass?: number;
  deviceProtocol?: number;
  locationId?: number;
  address?: number;
  portName?: string;
  connector?: string;
  controller: string;
  parentKey?: string;
  path: string[];
  depth: number;
  builtIn: boolean;
  powerAllocatedmA?: number;
  powerAvailablemA?: number;
  selfPowered?: boolean;
  interfaces: UsbInterface[];
  drivers: string[];
  disks: UsbDisk[];
  serialPorts: string[];
  networkInterfaces: string[];
  /** Ethernet link state from the network driver (IOLinkStatus / IOLinkSpeed). */
  networkLink?: { active: boolean; speedBps?: number };
  categories: Category[];
  isHub: boolean;
  hidUsages: { page: number; usage: number }[];
  raw: Props;
}

// ---------- helpers ----------

const num = (v: unknown): number | undefined => (typeof v === "number" && Number.isFinite(v) ? v : undefined);
const str = (v: unknown): string | undefined => (typeof v === "string" && v.trim() ? v.trim() : undefined);
const first = <T>(...vals: (T | undefined)[]) => vals.find((v) => v !== undefined);
const cls = (n: RegNode) => str(n.IOObjectClass) ?? "";
const entryName = (n: RegNode) => str(n.IORegistryEntryName) ?? "";

function isDevice(n: RegNode): boolean {
  return (
    num(n.idVendor) !== undefined &&
    num(n.idProduct) !== undefined &&
    n.bInterfaceNumber === undefined &&
    n.bInterfaceClass === undefined &&
    (num(n.bcdUSB) !== undefined || num(n.bDeviceClass) !== undefined || cls(n).includes("USBHostDevice"))
  );
}

function isInterface(n: RegNode): boolean {
  return num(n.bInterfaceNumber) !== undefined || num(n.bInterfaceClass) !== undefined;
}

function isController(n: RegNode): boolean {
  const c = cls(n);
  return /XHCI|EHCI|OHCI|UHCI|USBHostController/i.test(c) && !/Port$/.test(c) && !isDevice(n);
}

const GENERIC_CLASSES =
  /^(IOUSBHost(Device|Interface|Pipe)|IOUSBDevice|IOUSBInterface|IOMedia|IOService|IOUserClient|IOPartitionScheme|IOBlockStorage|IOSCSI|IOBDServices|IOUSBHostHIDDevice$|IOSerialBSDClient$)/;

/** Make plist values JSON-safe and short (Buffers → hex). */
function sanitize(v: unknown, depth = 0): unknown {
  if (Buffer.isBuffer(v)) {
    const h = v.toString("hex");
    return h.length > 96 ? `<${v.length} bytes> ${h.slice(0, 96)}…` : `<${h}>`;
  }
  if (v instanceof Date) return v.toISOString();
  if (Array.isArray(v)) return depth > 4 ? "[…]" : v.map((x) => sanitize(x, depth + 1));
  if (v && typeof v === "object") {
    if (depth > 4) return "{…}";
    const out: Props = {};
    for (const [k, val] of Object.entries(v)) if (k !== "IORegistryEntryChildren") out[k] = sanitize(val, depth + 1);
    return out;
  }
  return v;
}

// ---------- registry walk ----------

interface Ctx {
  controller: string;
  device?: UsbDevice;
  iface?: UsbInterface;
  portName?: string;
  connector?: string;
  portBuiltIn?: boolean;
}

/**
 * Two speed enums exist: legacy "Device Speed" (0 low, 1 full, 2 high, 3 super, 4 super+, 5 super+ 2x2)
 * and IOUSBHost "USBSpeed" (1 full, 2 low, 3 high, 4 super, 5 super+, 6 super+ 2x2). Normalize to legacy.
 */
const HOST_TO_LEGACY: Record<number, number> = { 1: 1, 2: 0, 3: 2, 4: 3, 5: 4, 6: 5 };
function normalizeSpeed(n: RegNode): number | undefined {
  const host = num(n.USBSpeed);
  if (host !== undefined) return HOST_TO_LEGACY[host];
  return num(first(n["Device Speed"], n.kUSBSpeed));
}

function buildDevice(n: RegNode, ctx: Ctx): UsbDevice {
  const vendorId = num(n.idVendor);
  const productId = num(n.idProduct);
  const locationId = num(n.locationID);
  const reportedVendor = str(first(n["USB Vendor Name"], n.kUSBVendorString, n["Vendor Name"]));
  const tableVendor = vendorId !== undefined ? VENDORS[vendorId] : undefined;
  const name =
    str(first(n["USB Product Name"], n.kUSBProductString, n["Product Name"])) ??
    (entryName(n) && entryName(n) !== "IOUSBHostDevice" ? entryName(n) : undefined) ??
    `Unknown device ${hex4(vendorId)}:${hex4(productId)}`;

  const parent = ctx.device;
  const builtIn =
    n["Built-In"] === true || n["non-removable"] === "yes" || ctx.portBuiltIn === true || (parent?.builtIn ?? false);

  // "Bus Power Available" is historically in 2 mA units; newer keys are plain mA.
  const busPowerUnits = num(n["Bus Power Available"]);
  const availablemA = first(
    num(n.UsbPowerSourceAllocation),
    busPowerUnits !== undefined ? busPowerUnits * 2 : undefined,
  );

  const attrs = num(n.bmAttributes);
  return {
    key: `${locationId !== undefined ? locationId.toString(16) : entryName(n)}-${vendorId}-${productId}`,
    name,
    vendor: reportedVendor ?? tableVendor,
    vendorFromTable: !reportedVendor && !!tableVendor,
    vendorId,
    productId,
    serial: str(first(n["USB Serial Number"], n.kUSBSerialNumberString, n["Serial Number"])),
    bcdUSB: num(n.bcdUSB),
    bcdDevice: num(n.bcdDevice),
    speedCode: normalizeSpeed(n),
    linkBps: num(n.UsbLinkSpeed),
    deviceClass: num(n.bDeviceClass),
    deviceSubClass: num(n.bDeviceSubClass),
    deviceProtocol: num(n.bDeviceProtocol),
    locationId,
    address: num(first(n["USB Address"], n.kUSBAddress)),
    portName: ctx.portName,
    connector: ctx.connector,
    controller: ctx.controller,
    parentKey: parent?.key,
    path: parent ? [...parent.path, parent.name] : [],
    depth: parent ? parent.depth + 1 : 0,
    builtIn,
    powerAllocatedmA: first(num(n.UsbPowerSinkAllocation), num(n.kUSBCurrentConfigurationPower)),
    powerAvailablemA: availablemA,
    selfPowered: attrs !== undefined ? (attrs & 0x40) !== 0 : undefined,
    interfaces: [],
    drivers: [],
    disks: [],
    serialPorts: [],
    networkInterfaces: [],
    categories: [],
    isHub: false,
    hidUsages: [],
    raw: sanitize(n) as Props,
  };
}

function walk(n: RegNode, ctx: Ctx, out: UsbDevice[]) {
  let next: Ctx = ctx;
  const c = cls(n);

  if (isController(n)) {
    const nm = entryName(n);
    next = { controller: nm && nm !== c ? `${c} (${nm})` : c };
  } else if (isDevice(n)) {
    const dev = buildDevice(n, ctx);
    out.push(dev);
    next = { controller: ctx.controller, device: dev };
  } else if (isInterface(n) && ctx.device) {
    const iface: UsbInterface = {
      number: num(n.bInterfaceNumber),
      classCode: num(n.bInterfaceClass),
      subClass: num(n.bInterfaceSubClass),
      protocol: num(n.bInterfaceProtocol),
      name: str(first(n["USB Interface Name"], n.kUSBString)),
      drivers: [],
    };
    ctx.device.interfaces.push(iface);
    next = { ...ctx, iface };
  } else if (/Port$/.test(c) || (!ctx.device && num(n.UsbConnector) !== undefined)) {
    // Controller root port or hub port: remember it for the device plugged into it.
    const connCode = num(n.UsbConnector);
    next = {
      ...ctx,
      iface: undefined,
      portName: entryName(n) || ctx.portName,
      connector: connectorName(connCode) ?? ctx.connector,
      portBuiltIn: connCode === 0xff || n["Built-In"] === true || ctx.portBuiltIn,
    };
  } else if (ctx.device) {
    const dev = ctx.device;
    // Driver objects hanging off a device or interface.
    if (c && !GENERIC_CLASSES.test(c)) {
      const target = ctx.iface ? ctx.iface.drivers : dev.drivers;
      if (!target.includes(c)) target.push(c);
      if (!dev.drivers.includes(c)) dev.drivers.push(c);
    }
    // Whole-disk media → BSD disk.
    if (n.Whole === true && str(n["BSD Name"])) {
      dev.disks.push({
        bsd: str(n["BSD Name"])!,
        name: entryName(n) || undefined,
        size: num(n.Size),
        removable: n.Removable === true,
        ejectable: n.Ejectable === true,
        volumes: [],
      });
    }
    // HID usage pages tell us what a HID function really is (gamepad vs monitor controls vs media keys).
    const addUsage = (page?: number, usage?: number) => {
      if (page === undefined || usage === undefined) return;
      if (!dev.hidUsages.some((u) => u.page === page && u.usage === usage)) dev.hidUsages.push({ page, usage });
    };
    addUsage(num(n.PrimaryUsagePage), num(n.PrimaryUsage));
    if (Array.isArray(n.DeviceUsagePairs))
      for (const pair of n.DeviceUsagePairs as Props[]) addUsage(num(pair.DeviceUsagePage), num(pair.DeviceUsage));
    const callout = str(n.IOCalloutDevice);
    if (callout && !dev.serialPorts.includes(callout)) dev.serialPorts.push(callout);
    if (str(n.IOInterfaceName) || /Ethernet|NetworkInterface/.test(c)) {
      const bsd = str(n["BSD Name"]);
      if (bsd && !bsd.startsWith("disk") && !dev.networkInterfaces.includes(bsd)) dev.networkInterfaces.push(bsd);
    }
    const linkStatus = num(n.IOLinkStatus);
    if (linkStatus !== undefined && (linkStatus & 1) !== 0) {
      // kIONetworkLinkValid = 1, kIONetworkLinkActive = 2
      const active = (linkStatus & 2) !== 0;
      const speed = num(n.IOLinkSpeed);
      dev.networkLink = {
        active: active || !!dev.networkLink?.active,
        speedBps: active && speed ? speed : dev.networkLink?.speedBps,
      };
    }
  }

  for (const child of n.IORegistryEntryChildren ?? []) walk(child, next, out);
}

function detectHub(d: UsbDevice): boolean {
  return (
    d.deviceClass === 0x09 ||
    d.interfaces.some((i) => i.classCode === 0x09) ||
    d.drivers.some((x) => /USB\d*\w*Hub(Device)?$/i.test(x) || /^AppleUSB\d+Hub/.test(x))
  );
}

function deriveCategories(d: UsbDevice): Category[] {
  const set = new Set<Category>();
  const hidUsageCats = d.hidUsages.map((u) => hidUsageCategory(u.page, u.usage)).filter((c): c is Category => !!c);
  for (const i of d.interfaces) {
    // HID interfaces are classified by usage page when the driver exposed it; the protocol byte is a fallback.
    if (i.classCode === 0x03 && hidUsageCats.length) continue;
    const cat = categoryForInterface(i.classCode, i.subClass, i.protocol);
    if (cat) set.add(cat);
  }
  hidUsageCats.forEach((c) => set.add(c));
  if (d.interfaces.length === 0 && d.deviceClass !== undefined && d.deviceClass !== 0) {
    const cat = categoryForInterface(d.deviceClass, d.deviceSubClass, d.deviceProtocol);
    if (cat) set.add(cat);
  }
  if (d.isHub) set.add("Hub");
  // Billboard (USB-C display status) is often declared at device level next to a vendor HID interface,
  // which is a firmware/config channel for the USB-C controller, not an input device.
  if (d.deviceClass === 0x11 || /billboard/i.test(d.name)) {
    set.add("Display");
    set.delete("HID");
  }
  if (d.disks.length) set.add("Storage");
  if (d.serialPorts.length || (d.vendorId !== undefined && SERIAL_BRIDGE_VIDS.has(d.vendorId))) set.add("Serial");
  if (d.networkInterfaces.length) set.add("Network");
  if (d.drivers.some((x) => /Audio/i.test(x))) set.add("Audio");
  if (d.drivers.some((x) => /MIDI/i.test(x))) set.add("MIDI");
  if (d.vendorId !== undefined && SECURITY_KEY_VIDS.has(d.vendorId)) set.add("Security Key");
  // ---- Specific device types, each from an unambiguous signal ----
  const nm = d.name;
  const vid = d.vendorId;
  const pid = d.productId;
  const hasHid = d.interfaces.some((i) => i.classCode === 0x03);

  // Phone / tablet: Apple product names, the Android Debug Bridge interface (ff/42/01), or an MTP interface.
  const appleMobile = vid === 0x05ac && /^(iPhone|iPad|iPod)\b/i.test(nm);
  const adb = d.interfaces.some((i) => i.classCode === 0xff && i.subClass === 0x42 && i.protocol === 0x01);
  const mtp = d.interfaces.some((i) => /^MTP$/i.test(i.name ?? ""));
  if (appleMobile || adb || mtp) {
    set.add("Phone / Tablet");
    set.delete("Camera"); // phones also expose photos over PTP
  }

  // Bootloader / DFU mode: DFU interface protocol 2 (handled per interface) or well-known boot IDs/names.
  const bootIds =
    (vid === 0x0483 && pid === 0xdf11) || // STM32 DFU
    (vid === 0x2e8a && pid === 0x0003) || // Raspberry Pi RP2040/RP2350 boot ROM
    (vid === 0x05ac && (pid === 0x1227 || pid === 0x1281)); // Apple DFU / recovery
  if (bootIds || /\b(bootloader|DFU mode|recovery mode|RP2 Boot)\b/i.test(nm)) set.add("Bootloader");

  // Card readers: mass storage that names itself a card reader (Realtek's "CRW" included).
  if (set.has("Storage") && /card ?reader|\bCRW\b|SD\/MMC|\bSD ?card|multi-?card|micro ?SD|\bCF ?card/i.test(nm)) {
    set.add("Card Reader");
    set.delete("Storage");
  }

  // Wireless receivers: HID dongles that call themselves receivers (Logitech Unifying/Bolt/Lightspeed, Razer…).
  if (hasHid && (/\b(receiver|dongle)\b/i.test(nm) || /unifying|lightspeed|logi bolt/i.test(nm)))
    set.add("Wireless Receiver");

  // Control surfaces: Elgato Stream Deck and Loupedeck (by vendor + name / vendor ID).
  if ((vid === 0x0fd9 && /stream ?deck/i.test(nm)) || vid === 0x2ec2 || /loupedeck|tourbox/i.test(nm))
    set.add("Control Surface");

  // Vendor-specific is noise when we already know something better.
  if (set.size > 1) set.delete("Vendor");
  // A bare "HID" next to a specific HID type adds nothing.
  if (set.has("HID") && HID_SPECIFIC.some((c) => set.has(c))) set.delete("HID");
  // Management chips inside hubs/docks (e.g. Microchip "USB2 Controller Hub", "Hub Feature Controller")
  // expose a vendor HID interface but are part of the hub, not a device you plugged in.
  const STRONG: Category[] = [
    "Audio",
    "MIDI",
    "Storage",
    "Keyboard",
    "Mouse",
    "Game Controller",
    "Camera",
    "Serial",
    "Network",
  ];
  if (!d.isHub && /\bhub\b/i.test(d.name) && !STRONG.some((c) => set.has(c))) {
    set.delete("HID");
    set.delete("Vendor");
    set.add("Hub Controller");
  }
  const ordered = CATEGORY_PRIORITY.filter((c) => set.has(c));
  // A hub is a hub first; anything else it exposes (monitor controls, billboard) is secondary.
  return d.isHub ? ["Hub", ...ordered.filter((c) => c !== "Hub")] : ordered;
}

/** Pure: turn ioreg plist roots into a flat device list. */
export function parseRegistry(roots: RegNode[]): UsbDevice[] {
  const out: UsbDevice[] = [];
  for (const r of roots) walk(r, { controller: "USB" }, out);
  // Same device can appear twice if roots overlap; keep the deepest-placed copy.
  const byKey = new Map<string, UsbDevice>();
  for (const d of out) {
    const prev = byKey.get(d.key);
    if (!prev || d.depth > prev.depth || d.interfaces.length > prev.interfaces.length) byKey.set(d.key, d);
  }
  const devices = [...byKey.values()];
  for (const d of devices) {
    d.isHub = detectHub(d);
    d.categories = deriveCategories(d);
  }
  return devices;
}

// ---------- volumes (diskutil) ----------

interface DiskutilEntry {
  DeviceIdentifier?: string;
  MountPoint?: string;
  VolumeName?: string;
  Content?: string;
  Size?: number;
  Partitions?: DiskutilEntry[];
  APFSVolumes?: DiskutilEntry[];
  APFSPhysicalStores?: { DeviceIdentifier?: string }[];
}

/** Pure: map physical whole-disk ids (disk4) → their volumes, following APFS containers. */
export function volumesByPhysicalDisk(list: { AllDisksAndPartitions?: DiskutilEntry[] }): Map<string, UsbVolume[]> {
  const map = new Map<string, UsbVolume[]>();
  const add = (disk: string, v: UsbVolume) => map.set(disk, [...(map.get(disk) ?? []), v]);
  const toVol = (e: DiskutilEntry): UsbVolume | undefined =>
    e.DeviceIdentifier
      ? { bsd: e.DeviceIdentifier, name: e.VolumeName, mountPoint: e.MountPoint, content: e.Content, size: e.Size }
      : undefined;
  for (const whole of list.AllDisksAndPartitions ?? []) {
    const id = whole.DeviceIdentifier;
    if (!id) continue;
    const physical = whole.APFSPhysicalStores?.length
      ? whole.APFSPhysicalStores.map((s) => s.DeviceIdentifier?.replace(/s\d+$/, "")).filter((x): x is string => !!x)
      : [id];
    const vols: UsbVolume[] = [];
    if (whole.MountPoint || whole.VolumeName) {
      const v = toVol(whole);
      if (v) vols.push(v);
    }
    for (const p of [...(whole.Partitions ?? []), ...(whole.APFSVolumes ?? [])]) {
      // Skip plumbing partitions (EFI, APFS container stubs) unless mounted.
      if (!p.MountPoint && !p.VolumeName) continue;
      if (p.Content === "EFI" && !p.MountPoint) continue;
      const v = toVol(p);
      if (v) vols.push(v);
    }
    for (const phys of physical) for (const v of vols) add(phys, v);
  }
  return map;
}

// ---------- shell ----------

async function ioreg(args: string[]): Promise<RegNode[]> {
  const { stdout } = await run("/usr/sbin/ioreg", [...args, "-l", "-w0", "-a"], EXEC_OPTS);
  if (!stdout.trim()) return [];
  const parsed = parsePlist(stdout);
  return (Array.isArray(parsed) ? parsed : [parsed]) as RegNode[];
}

export async function listUsbDevices(): Promise<UsbDevice[]> {
  // IOService plane under each USB controller: devices + interfaces + drivers + disks + serial ports.
  let devices = parseRegistry(await ioreg(["-r", "-c", "IOUSBHostController"]));
  // Fallbacks for unusual systems.
  if (devices.length === 0) devices = parseRegistry(await ioreg(["-r", "-c", "IOUSBHostDevice"]));
  if (devices.length === 0) devices = parseRegistry(await ioreg(["-p", "IOUSB"]));

  if (devices.some((d) => d.disks.length)) {
    try {
      const { stdout } = await run("/usr/sbin/diskutil", ["list", "-plist"], EXEC_OPTS);
      const vols = volumesByPhysicalDisk(parsePlist(stdout) as { AllDisksAndPartitions?: DiskutilEntry[] });
      for (const d of devices) for (const disk of d.disks) disk.volumes = vols.get(disk.bsd) ?? [];
    } catch {
      // Volumes are a nice-to-have.
    }
  }
  return devices;
}

/**
 * Cheap change detector for polling: the USB plane without properties (a few KB) plus the mount table.
 * Only when this changes do we pay for the full scan.
 */
export async function usbFingerprint(): Promise<string> {
  const [usb, mounts, links] = await Promise.all([
    run("/usr/sbin/ioreg", ["-p", "IOUSB", "-w0"], EXEC_OPTS).then((r) => r.stdout.replace(/<[^>]*>/g, "")),
    run("/sbin/mount", [], EXEC_OPTS).then(
      (r) => r.stdout,
      () => "",
    ),
    // Ethernet cable / link speed changes don't touch the USB tree, so watch interface status and media too.
    run("/sbin/ifconfig", [], EXEC_OPTS).then(
      (r) =>
        r.stdout
          .split("\n")
          .filter((l) => /^\S|status:|media:/.test(l))
          .join("\n"),
      () => "",
    ),
  ]);
  return [usb, mounts, links].join("\n--\n");
}

export async function ejectDisk(bsd: string): Promise<string> {
  const { stdout } = await run("/usr/sbin/diskutil", ["eject", bsd], EXEC_OPTS);
  return stdout.trim();
}
