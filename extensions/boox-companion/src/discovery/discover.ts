import { BooxClient, normalizeHost } from "../api/boox-client";
import { BooxError } from "../lib/errors";
import { getBooxPreferences } from "../lib/preferences";
import { BooxDevice } from "../models/boox";
import { readCachedDevice, writeCachedDevice } from "./device-cache";
import { listScanAddresses, neighborCandidates, openPortCandidates, subnetCandidates } from "./network";

export interface ConnectedBoox {
  device: BooxDevice;
  client: BooxClient;
}

export async function getConnectedBoox(options: { forceDiscovery?: boolean } = {}): Promise<ConnectedBoox> {
  const preferences = getBooxPreferences();
  const password = preferences.password;

  if (preferences.manualHost?.trim()) {
    const manual = await probeHost(preferences.manualHost, password, 1_200, true);
    if (!manual) throw new BooxError("The configured BOOX address is not responding");
    await writeCachedDevice(manual.device);
    return manual;
  }

  if (!options.forceDiscovery) {
    const cached = await readCachedDevice();
    if (cached) {
      const connected = await probeHost(cached.host, password, 700);
      if (connected) {
        await writeCachedDevice(connected.device);
        return connected;
      }
    }
  }

  const devices = await discoverBooxDevices(Boolean(preferences.scanVirtualInterfaces), password);
  if (!devices.length) throw new BooxError("No BOOXDrop device was found on the local network");
  const selected = devices[0];
  await writeCachedDevice(selected.device);
  return selected;
}

export async function discoverBooxDevices(includeVirtual = false, password?: string): Promise<ConnectedBoox[]> {
  const addresses = listScanAddresses(includeVirtual);
  const candidates = [...new Set([...subnetCandidates(addresses), ...(await neighborCandidates(addresses))])];
  if (!candidates.length) return [];
  const reachableCandidates = await openPortCandidates(candidates);

  const discovered: ConnectedBoox[] = [];
  const concurrency = 48;
  let cursor = 0;

  async function worker(): Promise<void> {
    while (cursor < reachableCandidates.length) {
      const candidate = reachableCandidates[cursor];
      cursor += 1;
      const result = await probeHost(candidate, password, 450);
      if (result && !discovered.some(({ device }) => device.id === result.device.id)) discovered.push(result);
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, reachableCandidates.length) }, () => worker()));
  return discovered.sort((left, right) => left.device.model.localeCompare(right.device.model));
}

export async function probeHost(
  input: string,
  password?: string,
  timeoutMs = 600,
  reportError = false
): Promise<ConnectedBoox | undefined> {
  let host: string;
  try {
    host = normalizeHost(input, 8085, password ? "https" : "http");
  } catch (error) {
    if (reportError) throw new BooxError("The configured BOOX address is invalid", undefined, error);
    return undefined;
  }
  try {
    const client = new BooxClient(host, password);
    await client.requirePing(timeoutMs);
    return { client, device: await client.getDevice() };
  } catch (error) {
    if (reportError) throw error;
    return undefined;
  }
}
