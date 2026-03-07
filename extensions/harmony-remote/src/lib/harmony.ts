/**
 * Harmony Hub client + shortcut storage.
 */

import getHarmonyClient from "@harmonyhub/client-ws";
import { LocalStorage, getPreferenceValues } from "@raycast/api";

// --- Storage keys ---
const HUB_IP_KEY = "harmony-hub-ip";
const HUB_CONFIG_KEY = "harmony-hub-config";
const SHORTCUTS_KEY = "harmony-shortcuts";

// --- Types ---

interface HubConfig {
  devices: Device[];
  activities: Activity[];
  timestamp: number;
}

export interface Device {
  id: string;
  name: string;
  commands: DeviceCommand[];
}

export interface DeviceCommand {
  name: string;
  deviceId: string;
  type: string;
}

export interface Activity {
  id: string;
  name: string;
}

export interface Shortcut {
  id: string;
  label: string;
  icon: string;
  type: "activity" | "device-command" | "off";
  // Activity shortcuts
  activityId?: string;
  // Device command shortcuts
  deviceId?: string;
  commandName?: string;
  commandType?: string;
  repeats?: number;
}

interface Preferences {
  commandHoldTime: string;
  commandDelay: string;
}

const CACHE_TTL = 24 * 60 * 60 * 1000;

// --- Hub IP ---

export async function getHubIp(): Promise<string | null> {
  return (await LocalStorage.getItem<string>(HUB_IP_KEY)) ?? null;
}

export async function saveHubIp(ip: string): Promise<void> {
  await LocalStorage.setItem(HUB_IP_KEY, ip);
}

// --- Hub Config Cache ---

export async function getCachedConfig(): Promise<HubConfig | null> {
  const cached = await LocalStorage.getItem<string>(HUB_CONFIG_KEY);
  if (!cached) return null;
  const config = JSON.parse(cached) as HubConfig;
  if (Date.now() - config.timestamp < CACHE_TTL && config.devices.length > 0) {
    return config;
  }
  return null;
}

// --- Shortcuts ---

export async function getShortcuts(): Promise<Shortcut[]> {
  const raw = await LocalStorage.getItem<string>(SHORTCUTS_KEY);
  if (!raw) return [];
  return JSON.parse(raw) as Shortcut[];
}

export async function saveShortcuts(shortcuts: Shortcut[]): Promise<void> {
  await LocalStorage.setItem(SHORTCUTS_KEY, JSON.stringify(shortcuts));
}

// --- Reset ---

export async function clearAllConfig(): Promise<void> {
  await LocalStorage.removeItem(HUB_IP_KEY);
  await LocalStorage.removeItem(HUB_CONFIG_KEY);
  await LocalStorage.removeItem(SHORTCUTS_KEY);
}

// --- Hub Connection ---

async function fetchConfig(
  client: ReturnType<typeof getHarmonyClient> extends Promise<infer T> ? T : never,
): Promise<HubConfig> {
  const rawConfig = (await client.getAvailableCommands()) as {
    device: Array<{
      id: string;
      label?: string;
      controlGroup: Array<{
        name: string;
        function: Array<{ name: string; action?: { command?: string } }>;
      }>;
    }>;
  };

  const devices: Device[] = rawConfig.device.map((d) => ({
    id: d.id,
    name: d.label || d.id,
    commands: d.controlGroup.flatMap((g) =>
      g.function.map((fn) => ({
        name: fn.name,
        deviceId: d.id,
        type: fn.action?.command || "IRCommand",
      })),
    ),
  }));

  const rawActivities = (await client.getActivities()) as Array<{ id: string; label: string }>;
  const activities: Activity[] = rawActivities
    .filter((a) => a.id !== "-1")
    .map((a) => ({ id: String(a.id), name: a.label }));

  const config: HubConfig = { devices, activities, timestamp: Date.now() };
  await LocalStorage.setItem(HUB_CONFIG_KEY, JSON.stringify(config));
  return config;
}

/**
 * Connect to hub, run action, disconnect.
 */
export async function withHub<T>(action: (hub: HubConnection) => Promise<T>): Promise<T> {
  const ip = await getHubIp();
  if (!ip) {
    throw new Error("No hub configured. Run 'Setup Harmony Hub' first.");
  }

  const client = await getHarmonyClient(ip);
  try {
    // Use cache if available, otherwise fetch fresh
    const config = (await getCachedConfig()) ?? (await fetchConfig(client));
    const hub = new HubConnection(client, config);
    return await action(hub);
  } finally {
    await client.end();
  }
}

/**
 * Connect to hub and fetch fresh config (for setup).
 */
export async function discoverHubConfig(ip: string): Promise<HubConfig> {
  const client = await getHarmonyClient(ip);
  try {
    return await fetchConfig(client);
  } finally {
    await client.end();
  }
}

export class HubConnection {
  constructor(
    private client: ReturnType<typeof getHarmonyClient> extends Promise<infer T> ? T : never,
    private config: HubConfig,
  ) {}

  get activities(): Activity[] {
    return this.config.activities;
  }

  get devices(): Device[] {
    return this.config.devices;
  }

  /**
   * Execute a shortcut.
   */
  async executeShortcut(shortcut: Shortcut): Promise<string> {
    switch (shortcut.type) {
      case "activity": {
        if (!shortcut.activityId) throw new Error("Shortcut missing activityId");
        await this.client.startActivity(shortcut.activityId);
        return shortcut.label;
      }
      case "off": {
        await this.client.turnOff();
        return "All Off";
      }
      case "device-command": {
        if (!shortcut.deviceId || !shortcut.commandName) {
          throw new Error("Shortcut missing device/command info");
        }
        await this.sendCommandById(
          shortcut.deviceId,
          shortcut.commandName,
          shortcut.commandType || "IRCommand",
          shortcut.repeats || 1,
        );
        return shortcut.label;
      }
      default:
        throw new Error(`Unknown shortcut type: ${shortcut.type}`);
    }
  }

  private async sendCommandById(
    deviceId: string,
    commandName: string,
    commandType: string,
    repeats: number,
  ): Promise<void> {
    const prefs = getPreferenceValues<Preferences>();
    const holdTime = parseInt(prefs.commandHoldTime || "100", 10);
    const delay = parseInt(prefs.commandDelay || "50", 10);

    const body = {
      command: commandName,
      deviceId: deviceId,
      type: commandType,
    };

    for (let i = 0; i < repeats; i++) {
      await this.client.send("holdAction", body);
      await sleep(holdTime);
      await this.client.send("releaseAction", body);
      if (i < repeats - 1) {
        await sleep(delay);
      }
    }
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
