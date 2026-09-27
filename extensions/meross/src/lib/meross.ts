import { getPreferenceValues, LocalStorage } from "@raycast/api";
import { createHash } from "crypto";
import type { EventEmitter } from "events";
import MerossCloud, { type DeviceDefinition, type MerossCloudDevice, type TokenData } from "meross-cloud";

const TOKEN_KEY = "tokenData";
const ipKey = (uuid: string) => `ip:${uuid}`;

// meross-cloud checks a stored token against a hash built from its *default* domain, but getTokenData()
// hashes the regional domain it was redirected to (e.g. iotx-eu). Re-hash so the token is actually reused.
const DEFAULT_DOMAIN = "iotx.meross.com";

const REQUEST_TIMEOUT_MS = 5000;

export type SwitchMode = "togglex" | "toggle" | "unsupported";

/** One switchable thing: a single plug, or one outlet of a power strip. Plain data, safe to cache. */
export interface Target {
  id: string;
  uuid: string;
  channel: number;
  title: string;
  deviceName: string;
  deviceType: string;
  online: boolean;
  mode: SwitchMode;
  on?: boolean;
  ip?: string;
}

export class MfaRequiredError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MfaRequiredError";
  }
}

function isMfaError(error: unknown) {
  return error instanceof Error && /^(1032|1033)\b/.test(error.message);
}

function withTimeout<T>(promise: Promise<T>, ms: number, what: string): Promise<T> {
  let timer: NodeJS.Timeout;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${what} timed out`)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

function call<T>(fn: (cb: (error: Error | null, data: T) => void) => unknown): Promise<T> {
  return new Promise((resolve, reject) => fn((error, data) => (error ? reject(error) : resolve(data))));
}

async function loadTokenData(): Promise<TokenData | undefined> {
  const raw = await LocalStorage.getItem<string>(TOKEN_KEY);
  return raw ? (JSON.parse(raw) as TokenData) : undefined;
}

async function saveTokenData(cloud: MerossCloud, email: string, password: string) {
  const tokenData = cloud.getTokenData();
  if (!tokenData) return;
  tokenData.hash = createHash("md5").update(`${DEFAULT_DOMAIN}${email}${password}`).digest("hex");
  await LocalStorage.setItem(TOKEN_KEY, JSON.stringify(tokenData));
}

function asArray<T>(value: T | T[] | undefined): T[] {
  if (value === undefined) return [];
  return Array.isArray(value) ? value : [value];
}

interface ChannelDefinition {
  devName?: string;
}

interface SystemAll {
  all?: {
    system?: { firmware?: { innerIp?: string } };
    digest?: { togglex?: { channel: number; onoff: number } | { channel: number; onoff: number }[] };
    control?: { toggle?: { onoff: number } };
  };
}

interface DeviceEntry {
  def: DeviceDefinition;
  device: MerossCloudDevice;
}

/**
 * One cloud session: logs in (reusing a stored token when possible), receives the device list and
 * opens the MQTT connection. Raycast commands are short-lived, so open one per command and close() it.
 */
export class MerossSession {
  private constructor(
    private readonly cloud: MerossCloud,
    private readonly entries: Map<string, DeviceEntry>,
  ) {}

  static async open(options: { mfaCode?: string } = {}): Promise<MerossSession> {
    const { email, password, localHttpFirst } = getPreferenceValues<Preferences>();
    const cloud = new MerossCloud({
      email,
      password,
      mfaCode: options.mfaCode,
      tokenData: await loadTokenData(),
      localHttpFirst,
      onlyLocalForGet: false,
      timeout: REQUEST_TIMEOUT_MS,
    });
    // Without a listener, EventEmitter would throw on MQTT errors and crash the command.
    (cloud as EventEmitter).on("error", (error: unknown, deviceId?: string) =>
      console.error("meross error", deviceId ?? "", error),
    );

    const entries = new Map<string, DeviceEntry>();
    cloud.on("deviceInitialized", (uuid, def, device) => entries.set(uuid, { def, device }));
    // Messages sent before the MQTT connection is up carry no response topic, so devices never answer.
    // meross-cloud emits "connected" only after it has set that topic; listen before connect() to not miss it.
    const mqttReady = new Promise<void>((resolve) => (cloud as EventEmitter).once("connected", () => resolve()));

    try {
      await withTimeout(
        call<number>((cb) => cloud.connect(cb)),
        20000,
        "Meross cloud login",
      );
    } catch (error) {
      cloud.disconnectAll(true);
      if (isMfaError(error)) throw new MfaRequiredError((error as Error).message);
      throw error;
    }
    await saveTokenData(cloud, email, password);

    if (entries.size > 0) {
      try {
        await withTimeout(mqttReady, 10000, "Meross MQTT connection");
      } catch (error) {
        // Local HTTP may still work, so continue and let the single requests fail if it doesn't.
        console.error(error);
      }
    }

    const knownIps = await LocalStorage.allItems<Record<string, string>>();
    for (const [uuid, { device }] of entries) {
      const ip = knownIps[ipKey(uuid)];
      if (ip) device.setKnownLocalIp(ip);
    }
    return new MerossSession(cloud, entries);
  }

  /** Lists targets and, for online devices, queries their current on/off state. `only` limits which devices are queried. */
  async targets(only?: (def: DeviceDefinition) => boolean): Promise<Target[]> {
    const entries = [...this.entries.values()].filter((entry) => !only || only(entry.def));
    const perDevice = await Promise.all(entries.map((entry) => this.deviceTargets(entry)));
    return perDevice.flat().sort((a, b) => Number(b.online) - Number(a.online) || a.title.localeCompare(b.title));
  }

  private async deviceTargets({ def, device }: DeviceEntry): Promise<Target[]> {
    const online = def.onlineStatus === 1;
    // Assume ToggleX (what current plugs use) unless the device tells us otherwise.
    let mode: SwitchMode = "togglex";
    let states = new Map<number, boolean>();
    let ip: string | undefined;

    if (online) {
      try {
        const data = await call<SystemAll>((cb) => device.getSystemAllData(cb));
        ip = data.all?.system?.firmware?.innerIp;
        const togglex = asArray(data.all?.digest?.togglex);
        if (togglex.length > 0) {
          mode = "togglex";
          states = new Map(togglex.map((t) => [t.channel, t.onoff === 1]));
        } else if (data.all?.control?.toggle) {
          mode = "toggle";
          states.set(0, data.all.control.toggle.onoff === 1);
        } else {
          mode = "unsupported";
        }
        if (ip) {
          device.setKnownLocalIp(ip);
          await LocalStorage.setItem(ipKey(def.uuid), ip);
        }
      } catch (error) {
        console.error(`Could not read state of ${def.devName}`, error);
      }
    }

    const channels = (def.channels ?? []) as ChannelDefinition[];
    const base = { uuid: def.uuid, deviceName: def.devName, deviceType: def.deviceType, online, mode, ip };
    if (channels.length <= 1 || mode === "toggle") {
      return [{ ...base, id: `${def.uuid}:0`, channel: 0, title: def.devName, on: states.get(0) }];
    }
    // Power strips: channel 0 switches the whole strip, channels 1..n the single outlets.
    return channels.map((channel, index) => ({
      ...base,
      id: `${def.uuid}:${index}`,
      channel: index,
      title: index === 0 ? def.devName : `${def.devName} – ${channel.devName || `Outlet ${index}`}`,
      on: states.get(index),
    }));
  }

  async setPower(target: Pick<Target, "uuid" | "channel" | "mode">, on: boolean): Promise<void> {
    const entry = this.entries.get(target.uuid);
    if (!entry) throw new Error("Device not found");
    const { device } = entry;
    if (target.mode === "toggle") {
      await call((cb) => device.controlToggle(on, cb));
    } else {
      await call((cb) => device.controlToggleX(target.channel, on, cb));
    }
  }

  close() {
    this.cloud.disconnectAll(true);
  }

  /** Ends the session on the Meross server and forgets the stored token. */
  async logout() {
    try {
      await call<number>((cb) => this.cloud.logout(cb));
    } finally {
      this.close();
      await LocalStorage.removeItem(TOKEN_KEY);
    }
  }
}

/** Opens a session, runs `fn` and always closes the session again. */
export async function withSession<T>(fn: (session: MerossSession) => Promise<T>, mfaCode?: string): Promise<T> {
  const session = await MerossSession.open({ mfaCode });
  try {
    return await fn(session);
  } finally {
    session.close();
  }
}

export async function forgetStoredLogin() {
  await LocalStorage.removeItem(TOKEN_KEY);
}

export function findTarget(targets: Target[], query: string): Target | undefined {
  const q = query.trim().toLowerCase();
  return (
    targets.find((t) => t.title.toLowerCase() === q) ??
    targets.find((t) => t.deviceName.toLowerCase() === q && t.channel === 0) ??
    targets.find((t) => t.title.toLowerCase().includes(q))
  );
}

export async function hasStoredLogin() {
  return (await LocalStorage.getItem<string>(TOKEN_KEY)) !== undefined;
}
