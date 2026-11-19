// Which network the default route is on, and its Wi-Fi name.
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { HOTSPOT_ID } from "./store.ts";
import type { NetKind, Probe } from "./store.ts";

// ---------- network identity ----------

export const kindOfPort = (p: string): NetKind =>
  /iphone usb|bluetooth pan|android/i.test(p)
    ? "hotspot"
    : /wi-?fi|airport/i.test(p)
      ? "wifi"
      : /ethernet|thunderbolt|lan|usb/i.test(p)
        ? "wired"
        : "other";

// A network is known by its router's address, not by its name: macOS hides the SSID from command-line tools
// unless the calling app has Location permission. Every personal hotspot / metered link shares one id.
// The router's MAC (when this process may read the neighbor table) only tells two networks apart that share
// an address, see round().
export function identify(x: { gw: string; port: string; expensive: boolean }): {
  id: string;
  kind: NetKind;
  label: string;
} {
  const pk = kindOfPort(x.port);
  const phone = x.gw === "172.20.10.1" || pk === "hotspot"; // iPhone hotspot subnet, USB / Bluetooth tethering
  if (phone || x.expensive)
    return { id: HOTSPOT_ID, kind: "hotspot", label: phone ? "Personal hotspot" : "Metered network" };
  const name = pk === "wifi" ? "Wi-Fi" : pk === "wired" ? "Ethernet" : "Network";
  return { id: `ip:${x.gw}`, kind: pk, label: `${name} · ${x.gw}` };
}

// `arp -an` lists interface-scoped entries too; `arp -n <ip>` can say "no entry" for the very same router.
export function parseArp(txt: string, gw: string): string | null {
  for (const line of txt.split("\n")) {
    if (!line.includes(`(${gw}) at `)) continue;
    const m = /\bat ([0-9a-f]{1,2}(?::[0-9a-f]{1,2}){5}) on/i.exec(line);
    if (m)
      return m[1]
        .split(":")
        .map((b) => b.toLowerCase().padStart(2, "0"))
        .join(":");
  }
  return null;
}

export function parsePort(txt: string, iface: string): string {
  for (const m of txt.matchAll(/Hardware Port: (.+)\nDevice: (\S+)/g)) if (m[2] === iface) return m[1].trim();
  return "";
}

// First entry under "Current Network Information:" in `system_profiler SPAirPortDataType` is the joined network.
export function parseSsid(txt: string): string | null {
  const s = /Current Network Information:\s*\n\s*([^\n]+?):\s*\n/.exec(txt)?.[1]?.trim();
  return s && !/redacted/i.test(s) ? s : null;
}

export const SSID_RETRY_MS = 6 * 3600 * 1000;

// `system_profiler SPAirPortDataType` takes ~8.5 s (it scans), so it runs detached, once per new network,
// and a later tick reads the file.
export function startProbe(dir: string, now: number, id: string): Probe | undefined {
  let fd = -1;
  try {
    const file = path.join(dir, `ssid-${now}.txt`);
    fd = fs.openSync(file, "w");
    const child = spawn("/usr/bin/nice", ["-n", "10", "/usr/sbin/system_profiler", "SPAirPortDataType"], {
      detached: true,
      stdio: ["ignore", fd, "ignore"],
    });
    child.on("error", () => {});
    child.unref();
    return child.pid ? { id, pid: child.pid, start: now, file } : undefined;
  } catch {
    return undefined;
  } finally {
    if (fd >= 0) fs.closeSync(fd);
  }
}
