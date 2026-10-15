import { loadPanelState, syncServiceConfig } from "./config";
import { listShareEntries } from "./list";
import {
  listInterfaces,
  pickSelectedInterface,
  type NetworkInterface,
} from "./network";
import { resolvePreferences, type ResolvedPreferences } from "./preferences";
import { probe } from "./service";
import type { ProbeResult, ServiceConfig, ShareEntry } from "./types";

export type Snapshot = {
  probe: ProbeResult;
  interfaces: NetworkInterface[];
  selectedHost: string;
  preferences: ResolvedPreferences;
  config: ServiceConfig;
  entries: ShareEntry[];
};

/**
 * Everything the panel shows, taken fresh: settings and panel choices are flushed to the shared config first
 * (so a running service picks them up immediately), then the service is asked what it is actually doing, and
 * the share list is read from whichever side currently owns it.
 */
export async function loadSnapshot(): Promise<Snapshot> {
  const preferences = resolvePreferences();
  const state = await loadPanelState();
  const interfaces = listInterfaces();
  const selectedHost = pickSelectedInterface(state.host, interfaces);
  const config = await syncServiceConfig({ preferences, host: selectedHost });
  const probeResult = await probe();
  const entries = await listShareEntries();
  return {
    probe: probeResult,
    interfaces,
    selectedHost,
    preferences,
    config,
    entries,
  };
}
