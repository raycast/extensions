import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * MAC OUI prefix → vendor lookup. Reads a compact two-column table
 * (prefix\tvendor, one entry per line) from the extension's assets folder.
 * The table is generated from the IEEE OUI registry; lookups are by the
 * 24-bit prefix (XX:XX:XX, uppercased, no separators).
 */
let table: Map<string, string> | null = null;

const CANDIDATE_PATHS = [
  // Bundled assets — dev and installed extension
  join(__dirname, "..", "assets", "oui.compact.txt"),
];

function loadTable(): Map<string, string> {
  if (table) return table;
  const map = new Map<string, string>();

  let found = false;
  for (const path of CANDIDATE_PATHS) {
    try {
      const raw = readFileSync(path, "utf8");
      for (const line of raw.split(/\r?\n/)) {
        const tab = line.indexOf("\t");
        if (tab === -1) continue;
        const prefixPart = line.slice(0, tab).trim();
        if (!/^[0-9A-Fa-f]{6}$/.test(prefixPart)) continue;
        const vendor = line.slice(tab + 1).trim();
        if (!vendor) continue;
        map.set(prefixPart.toUpperCase(), vendor);
      }
      found = true;
      break;
    } catch {
      // try next path
    }
  }
  if (!found) {
    console.log("OUI: oui table not found — vendor lookup disabled");
  }
  table = map;
  return map;
}

export function vendorForMac(mac: string): string | undefined {
  const clean = mac.toUpperCase().replace(/:/g, "");
  if (clean.length < 6) return undefined;
  return loadTable().get(clean.slice(0, 6));
}

export function shortVendorForMac(mac: string): string | undefined {
  const full = vendorForMac(mac);
  if (!full) return undefined;
  const first = full.split(/[ ,]/).find((t) => t.length > 0);
  return first || full;
}
