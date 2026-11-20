import { networkInterfaces } from "os";
import { IPEntry } from "./types";

/** Local IPs from every non-internal interface. Works the same on macOS and Windows. */
export function getLocalIPs(): IPEntry[] {
  const entries: IPEntry[] = [];

  for (const [name, networks] of Object.entries(networkInterfaces())) {
    for (const net of networks ?? []) {
      if (net.internal) continue;

      // Link-local and unique-local addresses are noise — they're never the address
      // anyone means when they ask for "my IP".
      if (net.family === "IPv6" && /^(fe80|fc|fd)/i.test(net.address)) continue;

      entries.push({
        key: `local-${name}-${net.address}`,
        ip: net.address,
        source: name,
        kind: "local",
        family: net.family,
      });
    }
  }

  return entries;
}
