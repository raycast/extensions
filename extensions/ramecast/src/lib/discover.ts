import { ADAPTERS, Device } from "./protocols";
import { discoverAirPlay, SystemTarget, systemTargets } from "./protocols/system";

export interface Discovered {
  devices: Device[];
  system: SystemTarget[];
  /** Device types that couldn't be searched (e.g. "DLNA: bind EACCES"); results from the others are kept. */
  errors: string[];
}

const PRIORITY = ADAPTERS.map((a) => a.protocol);

/** What a scan shows before any device answers (e.g. Windows' built-in Wireless Display). */
export function initialDiscovered(): Discovered {
  return { devices: [], system: systemTargets(), errors: [] };
}

const message = (e: unknown) => (e instanceof Error ? e.message : String(e));

/**
 * Scan every protocol at once, reporting progress through `onUpdate` (including an initial snapshot).
 * When one device answers on several of RameCast's own protocols (e.g. a Sony TV with Chromecast
 * built in also offers DLNA), keep only the highest-priority one: Google Cast, then Roku, then DLNA.
 * AirPlay entries are listed separately. Rejects only if no protocol could be searched at all.
 */
export async function discoverAll(onUpdate: (found: Discovered) => void, durationMs = 8000): Promise<Discovered> {
  const devices = new Map<string, Device>();
  const system = new Map<string, SystemTarget>(systemTargets().map((t) => [t.id, t]));
  const errors: string[] = [];

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
      errors: [...errors],
    };
  };
  const report = () => onUpdate(snapshot());
  report();

  const scans = [
    ...ADAPTERS.map((a) => ({
      label: a.label,
      run: () =>
        a.discover((d) => {
          devices.set(`${d.protocol}:${d.id}`, d);
          report();
        }, durationMs),
    })),
    ...(process.platform === "darwin"
      ? [
          {
            label: "AirPlay",
            run: () =>
              discoverAirPlay((t) => {
                system.set(t.id, t);
                report();
              }, durationMs),
          },
        ]
      : []),
  ];
  await Promise.all(
    scans.map((scan) =>
      scan.run().catch((e) => {
        errors.push(`${scan.label}: ${message(e)}`);
        report();
      }),
    ),
  );

  if (errors.length === scans.length) {
    throw new Error(`Couldn't search the network. ${errors.join("; ")}`);
  }
  return snapshot();
}
