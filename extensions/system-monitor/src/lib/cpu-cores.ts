import { cpus } from "os";

import { execf } from "./exec";

/** Apple Silicon core cluster: Performance or Efficiency. */
export type CoreClusterType = "P" | "E";

/** IORegistry little-endian byte string, e.g. `09000000` → 9. */
function parseLittleEndianHex(hex: string): number | null {
  if (hex.length === 0 || hex.length % 2 !== 0) {
    return null;
  }

  const bytes = hex.match(/../g) ?? [];
  const value = parseInt(bytes.reverse().join(""), 16);
  return Number.isNaN(value) ? null : value;
}

/**
 * Parse `ioreg -r -d 1 -k cluster-type` into an `os.cpus()` index → cluster-type map.
 *
 * The device tree numbers each core with `cpu-id`, which is the same processor
 * number `os.cpus()` enumerates (verified against background-QoS load on an M1
 * Pro: cpu-id 0–1 carry `cluster-type "E"` and are the only indices that absorb
 * background work). Returns null — the caller falls back to unlabeled cores —
 * unless every cpu-id from 0 to `expectedCount - 1` appears exactly once with a
 * P or E cluster type. Intel Macs have no `cluster-type` key, so ioreg prints
 * nothing and this returns null.
 */
export function parseCoreClusterTypes(output: string, expectedCount: number): CoreClusterType[] | null {
  if (expectedCount <= 0) {
    return null;
  }

  const types: (CoreClusterType | undefined)[] = Array.from({ length: expectedCount });

  for (const block of output.split(/^\s*\+-o /m).slice(1)) {
    if (!/"device_type" = <"cpu">/.test(block)) {
      continue;
    }

    const idMatch = block.match(/"cpu-id" = <([0-9a-f]+)>/i);
    const typeMatch = block.match(/"cluster-type" = <"([A-Za-z])">/);
    if (!idMatch || !typeMatch) {
      return null;
    }

    const id = parseLittleEndianHex(idMatch[1]);
    const type = typeMatch[1].toUpperCase();
    if (id === null || id >= expectedCount || (type !== "P" && type !== "E") || types[id] !== undefined) {
      return null;
    }

    types[id] = type;
  }

  return types.every((type) => type !== undefined) ? (types as CoreClusterType[]) : null;
}

let cachedClusterTypes: Promise<CoreClusterType[] | null> | undefined;

/** Resolve the per-core cluster map once per session; null means "unverified, label as C1…Cn". */
export function getCoreClusterTypes(coreCount = cpus().length): Promise<CoreClusterType[] | null> {
  cachedClusterTypes ??= execf("/usr/sbin/ioreg", ["-r", "-d", "1", "-k", "cluster-type"])
    .then((output) => parseCoreClusterTypes(output, coreCount))
    .catch(() => null);

  return cachedClusterTypes;
}

/** Exported for tests. */
export function resetCoreClusterTypesCache(): void {
  cachedClusterTypes = undefined;
}

/** `P3` / `E1` when the cluster map is verified, plain `C3` otherwise. Core numbers are 1-based. */
export function coreLabel(core: number, clusterTypes?: CoreClusterType[] | null): string {
  return `${clusterTypes?.[core - 1] ?? "C"}${core}`;
}

/** "10 (8 Performance and 2 Efficiency)" → "10 (8P + 2E)" — the full phrasing overflows a paired row. */
export function shortCores(totalCores?: string | null): string {
  if (!totalCores) {
    return "-";
  }

  return totalCores.replace(/\((\d+) performance and (\d+) efficiency\)/i, "($1P + $2E)");
}
