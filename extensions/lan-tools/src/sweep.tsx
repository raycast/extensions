import { updateCommandMetadata } from "@raycast/api";
import { refreshMDNS } from "./mdns";
import { buildDevices, primaryInterface, readNeighborTable } from "./scan";
import { loadState, mergeState, saveState, withStability } from "./state";
import { raycastStorage } from "./storage";
import type { Device } from "./types";

/**
 * Streaming sweep for the inventory view (C5). Reads the neighbor table
 * instantly and calls `onUpdate` with devices as they materialize:
 *   1. arp only (no names, ~instant)
 *   2. mDNS names streamed in as each resolves (onName)
 * Ping + port scan are NOT part of the sweep — they run on-demand as a
 * focused-host probe (index.tsx), keeping the sweep under the <30s gate.
 * Persists the final state. `onPhase` reports the current phase plus an
 * optional quantitative progress `(done, total)`.
 */
export async function runSweepStreaming(
  onUpdate: (devices: Device[], phase: "arp" | "mdns") => void,
  onPhase?: (
    phase: "arp" | "mdns" | "done",
    progress?: { done: number; total: number },
  ) => void,
): Promise<void> {
  const state = await loadState(raycastStorage);
  const now = Date.now() / 1000;
  const iface = primaryInterface();
  if (!iface) throw new Error("No primary interface found");

  // Status bar (root-search subtitle) reflects the sweep in progress.
  await updateCommandMetadata({ subtitle: "Scanning local network…" });

  const neighbors = readNeighborTable();

  // 1. ARP instantly.
  onUpdate(
    buildDevices(state.devices, neighbors, { nameByIP: {}, typeByIP: {} }, now),
    "arp",
  );
  onPhase?.("arp");

  // 2. Stream mDNS names in; this is the terminal phase.
  const nameByIP: Record<string, string> = {};
  const typeByIP: Record<string, string> = {};
  const servicesByIP: Record<string, import("./types").MDNSService[]> = {};
  await refreshMDNS(
    (ip, name, type, svcs) => {
      nameByIP[ip] = name;
      typeByIP[ip] = type;
      servicesByIP[ip] = svcs;
      onUpdate(
        buildDevices(
          state.devices,
          neighbors,
          { nameByIP, typeByIP, servicesByIP },
          now,
        ),
        "mdns",
      );
    },
    (done, total) => onPhase?.("mdns", { done, total }),
  );

  // Final: names settled, then persist.
  const devices = buildDevices(
    state.devices,
    neighbors,
    { nameByIP, typeByIP, servicesByIP },
    now,
  );
  onUpdate(devices, "mdns");
  onPhase?.("done");

  const stabilized = withStability(state, devices);
  const next = mergeState(state, stabilized, now, {
    ip: iface.ip,
    prefixLen: iface.prefixLen,
  });
  await saveState(next, raycastStorage);
  await updateCommandMetadata({
    subtitle: `${stabilized.length} devices · scan complete`,
  });
}
