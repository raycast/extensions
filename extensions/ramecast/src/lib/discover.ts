import { ADAPTERS, Device } from "./protocols";
import { discoverAirPlay, SystemTarget, systemTargets } from "./protocols/system";

export interface Discovered {
  devices: Device[];
  system: SystemTarget[];
}

const PRIORITY = ADAPTERS.map((a) => a.protocol);

/**
 * Scan every protocol at once. When one device answers on several protocols (e.g. a Sony TV with
 * Chromecast built in also offers DLNA), keep only the highest-priority one.
 */
export async function discoverAll(onUpdate: (found: Discovered) => void, durationMs = 8000): Promise<Discovered> {
  const devices = new Map<string, Device>();
  const system = new Map<string, SystemTarget>(systemTargets().map((t) => [t.id, t]));

  const snapshot = (): Discovered => {
    const byHost = new Map<string, Device>();
    for (const d of devices.values()) {
      const current = byHost.get(d.host);
      if (!current || PRIORITY.indexOf(d.protocol) < PRIORITY.indexOf(current.protocol)) byHost.set(d.host, d);
    }
    // Several Cast devices can share a host (speaker groups), so de-duplicate per host only across protocols.
    const winners = [...devices.values()].filter((d) => byHost.get(d.host)?.protocol === d.protocol);
    return {
      devices: winners.sort((a, b) => a.name.localeCompare(b.name)),
      system: [...system.values()].sort((a, b) => a.name.localeCompare(b.name)),
    };
  };
  const report = () => onUpdate(snapshot());

  await Promise.all([
    ...ADAPTERS.map((a) =>
      a
        .discover((d) => {
          devices.set(`${d.protocol}:${d.id}`, d);
          report();
        }, durationMs)
        .catch(() => undefined),
    ),
    discoverAirPlay((t) => {
      system.set(t.id, t);
      report();
    }, durationMs).catch(() => undefined),
  ]);
  return snapshot();
}
