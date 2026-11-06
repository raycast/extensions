import dgram from "node:dgram";
import { isIP } from "node:net";
import { networkInterfaces } from "node:os";
import { XMLParser, XMLValidator } from "fast-xml-parser";
import type { RokuApp, RokuDevice, RokuMediaPlayer } from "./types";

export type RokuErrorCode =
  "invalid-host" | "invalid-command" | "timeout" | "network" | "http" | "invalid-response" | "wake" | "cancelled";

export class RokuError extends Error {
  constructor(
    message: string,
    public readonly code: RokuErrorCode,
    public readonly status?: number,
  ) {
    super(message);
    this.name = "RokuError";
  }
}

/** Accept an address, never an arbitrary URL that could redirect a command. */
export function normalizeHost(input: string): string {
  const host = input.trim().toLowerCase();
  if (isIP(host) === 4) return host;
  if (
    !host ||
    host.length > 253 ||
    /^[\d.]+$/.test(host) ||
    !host.split(".").every((label) => /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(label))
  ) {
    throw new RokuError(
      "Enter the Roku's IPv4 address or hostname, without http://, a port, or a path.",
      "invalid-host",
    );
  }
  return host;
}

export function describeRokuError(error: unknown): string {
  if (error instanceof Error) return error.message;
  return "Could not communicate with the Roku. Check that it is on the same network.";
}

export function checkRokuCancellation(signal?: AbortSignal): void {
  if (signal?.aborted) throw new RokuError("The remaining Roku actions were cancelled.", "cancelled");
}

const parser = new XMLParser({
  ignoreAttributes: false,
  parseTagValue: false,
  parseAttributeValue: false,
  trimValues: true,
});
const commandQueues = new Map<string, Promise<void>>();
const KEYS = new Set([
  "Home",
  "Rev",
  "Fwd",
  "Play",
  "Select",
  "Left",
  "Right",
  "Down",
  "Up",
  "Back",
  "InstantReplay",
  "Info",
  "Backspace",
  "Search",
  "Enter",
  "FindRemote",
  "VolumeDown",
  "VolumeMute",
  "VolumeUp",
  "Power",
  "PowerOn",
  "PowerOff",
  "ChannelUp",
  "ChannelDown",
  "InputTuner",
  "InputHDMI1",
  "InputHDMI2",
  "InputHDMI3",
  "InputHDMI4",
  "InputAV1",
]);

function asObject(value: unknown): Record<string, unknown> | undefined {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function booleanValue(value: unknown): boolean | undefined {
  return value === "true" ? true : value === "false" ? false : undefined;
}

function parseXml(text: string): Record<string, unknown> {
  if (text.length > 2_000_000 || /<!DOCTYPE|<!ENTITY/i.test(text) || XMLValidator.validate(text) !== true) {
    throw new RokuError("The device returned an invalid Roku response.", "invalid-response");
  }
  const result = asObject(parser.parse(text));
  if (!result) throw new RokuError("The device returned an invalid Roku response.", "invalid-response");
  return result;
}

function parseApp(value: unknown): RokuApp | undefined {
  const app = asObject(value);
  const id = app && stringValue(app["@_id"]);
  if (!app || !id) return undefined;
  return {
    id,
    name: stringValue(app["#text"]) ?? id,
    type: stringValue(app["@_type"]),
    version: stringValue(app["@_version"]),
  };
}

function enqueue(key: string, action: () => Promise<void>): Promise<void> {
  const work = (commandQueues.get(key) ?? Promise.resolve()).catch(() => undefined).then(action);
  commandQueues.set(key, work);
  const clean = () => {
    if (commandQueues.get(key) === work) commandQueues.delete(key);
  };
  void work.then(clean, clean);
  return work;
}

export class RokuClient {
  public readonly host: string;
  private readonly baseUrl: string;
  private readonly timeoutMs: number;

  constructor(host: string, options: { timeoutMs?: number; port?: number } = {}) {
    this.host = normalizeHost(host);
    const port = options.port ?? 8060;
    this.timeoutMs = options.timeoutMs ?? 3500;
    if (
      !Number.isInteger(port) ||
      port < 1 ||
      port > 65535 ||
      !Number.isFinite(this.timeoutMs) ||
      this.timeoutMs <= 0
    ) {
      throw new RokuError("Invalid connection settings.", "invalid-host");
    }
    this.baseUrl = `http://${this.host}:${port}`;
  }

  private async request(path: string, method: "GET" | "POST" = "GET"): Promise<string> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const response = await fetch(`${this.baseUrl}${path}`, { method, signal: controller.signal, redirect: "error" });
      // Keep the deadline active while reading the body as well as waiting for headers.
      const text = await response.text();
      if (!response.ok) {
        if (response.status === 403) {
          throw new RokuError(
            "Roku refused the command (403). On the TV, go to Settings → System → Advanced system settings → Control by mobile apps and select Enabled (inside Network access on some models). If it is already enabled, wake the TV and try again.",
            "http",
            403,
          );
        }
        throw new RokuError(
          `Roku returned HTTP ${response.status}. This command may not be available on this model or software version.`,
          "http",
          response.status,
        );
      }
      return text;
    } catch (error) {
      if (error instanceof RokuError) throw error;
      if (controller.signal.aborted)
        throw new RokuError("The Roku did not respond in time. It may be asleep or disconnected.", "timeout");
      throw new RokuError(
        "Could not reach the Roku. Check its address, local network access, and whether it is awake.",
        "network",
      );
    } finally {
      clearTimeout(timer);
    }
  }

  async getDeviceInfo(): Promise<RokuDevice> {
    const info = asObject(parseXml(await this.request("/query/device-info"))["device-info"]);
    if (!info) throw new RokuError("This address did not return Roku device information.", "invalid-response");
    const id = stringValue(info["serial-number"]) ?? stringValue(info.udn);
    const model =
      stringValue(info["friendly-model-name"]) ?? stringValue(info["model-name"]) ?? stringValue(info["model-number"]);
    if (!id || !model)
      throw new RokuError("This address did not return identifiable Roku device information.", "invalid-response");
    const isTv = booleanValue(info["is-tv"]);
    const macs = [
      ...new Set(
        [stringValue(info["wifi-mac"]), stringValue(info["ethernet-mac"])].filter((mac): mac is string => Boolean(mac)),
      ),
    ];
    return {
      id,
      name:
        stringValue(info["user-device-name"]) ??
        stringValue(info["friendly-device-name"]) ??
        stringValue(info["model-name"]) ??
        this.host,
      host: this.host,
      model,
      softwareVersion: stringValue(info["software-version"]),
      isTv,
      powerMode: stringValue(info["power-mode"]),
      controlMode: stringValue(info["ecp-setting-mode"]),
      macs,
      capabilities: {
        volume: booleanValue(info["supports-audio-volume-control"]) ?? (isTv === true ? true : undefined),
        power: booleanValue(info["supports-tv-power-control"]) ?? (isTv === true ? true : undefined),
        findRemote: booleanValue(info["supports-find-remote"]),
      },
    };
  }

  async getApps(): Promise<RokuApp[]> {
    const xml = parseXml(await this.request("/query/apps"));
    if (!("apps" in xml)) throw new RokuError("The Roku did not return an app list.", "invalid-response");
    const apps = asObject(xml.apps)?.app;
    if (apps === undefined) return [];
    return (Array.isArray(apps) ? apps : [apps]).map(parseApp).filter((app): app is RokuApp => Boolean(app));
  }

  async getActiveApp(): Promise<RokuApp | undefined> {
    const xml = parseXml(await this.request("/query/active-app"));
    if (!("active-app" in xml)) throw new RokuError("The Roku did not return its active app.", "invalid-response");
    const raw = asObject(xml["active-app"])?.app;
    const app = parseApp(raw);
    if (app) return app;
    // Older firmware represents Home as <app>Roku</app>, without an app ID.
    const name = typeof raw === "string" ? raw : asObject(raw)?.["#text"];
    if (name === "Roku" && !stringValue(asObject(raw)?.["@_id"])) {
      return { id: "home", name: "Roku Home", type: "home" };
    }
    return undefined;
  }

  pressKey(key: string, options: { signal?: AbortSignal } = {}): Promise<void> {
    if (!KEYS.has(key) && !(key.startsWith("Lit_") && [...key.slice(4)].length === 1)) {
      return Promise.reject(new RokuError("That remote key is not supported.", "invalid-command"));
    }
    return enqueue(this.baseUrl, async () => {
      checkRokuCancellation(options.signal);
      await this.request(`/keypress/${encodeURIComponent(key)}`, "POST");
    });
  }

  /** Current playback state; returns undefined when nothing is playing or the firmware lacks the endpoint. */
  async getMediaPlayer(): Promise<RokuMediaPlayer | undefined> {
    const xml = parseXml(await this.request("/query/media-player"));
    const player = asObject(xml.player);
    if (!player) return undefined;
    const plugin = asObject(player.plugin);
    const ms = (value: unknown) => {
      const match = /^(\d+)\s*ms$/.exec(stringValue(value) ?? "");
      return match ? Number(match[1]) : undefined;
    };
    return {
      state: stringValue(player["@_state"]) ?? "unknown",
      error: booleanValue(player["@_error"]),
      appId: plugin ? stringValue(plugin["@_id"]) : undefined,
      appName: plugin ? stringValue(plugin["@_name"]) : undefined,
      positionMs: ms(player.position),
      durationMs: ms(player.duration),
      isLive: booleanValue(player.is_live),
    };
  }

  /** URL of an app's icon served by the Roku itself. */
  iconUrl(appId: string): string {
    return `${this.baseUrl}/query/icon/${encodeURIComponent(appId)}`;
  }

  /** Download an app icon as raw bytes. */
  async getIcon(appId: string): Promise<Buffer> {
    if (!/^[a-zA-Z0-9._-]+$/.test(appId)) throw new RokuError("The Roku app ID is invalid.", "invalid-command");
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const response = await fetch(this.iconUrl(appId), { signal: controller.signal, redirect: "error" });
      if (!response.ok) throw new RokuError(`Icon request failed (${response.status}).`, "http", response.status);
      const bytes = Buffer.from(await response.arrayBuffer());
      if (bytes.length > 2_000_000) throw new RokuError("Icon is too large.", "invalid-response");
      return bytes;
    } catch (error) {
      if (error instanceof RokuError) throw error;
      throw new RokuError("Could not download the app icon.", "network");
    } finally {
      clearTimeout(timer);
    }
  }

  /** Open Roku's universal search for a title or person; optionally auto-launch the best match. */
  search(keyword: string, options: { launch?: boolean } = {}): Promise<void> {
    const query = keyword.trim();
    if (!query || query.length > 200)
      return Promise.reject(new RokuError("Enter a search of 1–200 characters.", "invalid-command"));
    const params = new URLSearchParams({ keyword: query });
    if (options.launch) params.set("launch", "true");
    return enqueue(this.baseUrl, async () => {
      await this.request(`/search/browse?${params.toString()}`, "POST");
    });
  }

  sendText(text: string): Promise<void> {
    if ([...text].length > 1000)
      return Promise.reject(new RokuError("Send up to 1,000 characters at a time.", "invalid-command"));
    return enqueue(this.baseUrl, async () => {
      for (const character of text) await this.request(`/keypress/Lit_${encodeURIComponent(character)}`, "POST");
    });
  }

  launchApp(id: string, options: { signal?: AbortSignal } = {}): Promise<void> {
    if (!/^[a-zA-Z0-9._-]+$/.test(id))
      return Promise.reject(new RokuError("The Roku app ID is invalid.", "invalid-command"));
    return enqueue(this.baseUrl, async () => {
      checkRokuCancellation(options.signal);
      await this.request(`/launch/${encodeURIComponent(id)}`, "POST");
    });
  }
}

/** Sends wake packets only; callers must query the TV to verify that it woke. */
export async function wakeDevice(device: RokuDevice, options: { signal?: AbortSignal } = {}): Promise<void> {
  checkRokuCancellation(options.signal);
  const host = normalizeHost(device.host);
  const macs = [
    ...new Set((device.macs ?? []).map((mac) => mac.replace(/[:-]/g, "")).filter((mac) => /^[a-f\d]{12}$/i.test(mac))),
  ];
  if (!macs.length)
    throw new RokuError("No network hardware address is saved. Connect while the TV is awake first.", "wake");
  const destinations = new Set(["255.255.255.255"]);
  if (isIP(host) === 4) destinations.add(host);
  for (const entries of Object.values(networkInterfaces())) {
    for (const entry of entries ?? []) {
      if (entry.family !== "IPv4" || entry.internal) continue;
      const address = entry.address.split(".").map(Number);
      const mask = entry.netmask.split(".").map(Number);
      destinations.add(address.map((octet, i) => octet | (~mask[i] & 255)).join("."));
    }
  }
  await new Promise<void>((resolve, reject) => {
    const socket = dgram.createSocket("udp4");
    let finished = false;
    const finish = (error?: Error) => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      options.signal?.removeEventListener("abort", onAbort);
      try {
        socket.close();
      } catch {
        /* The socket may have failed before binding. */
      }
      if (error) reject(error);
      else resolve();
    };
    const timer = setTimeout(() => finish(new RokuError("Could not send the wake request.", "wake")), 2500);
    const onAbort = () => finish(new RokuError("The wake request was cancelled.", "cancelled"));
    options.signal?.addEventListener("abort", onAbort, { once: true });
    if (options.signal?.aborted) {
      onAbort();
      return;
    }
    socket.on("error", () => finish(new RokuError("Could not send a wake request on this network.", "wake")));
    socket.bind(0, () => {
      if (finished) return;
      try {
        checkRokuCancellation(options.signal);
        socket.setBroadcast(true);
        const sends = macs.flatMap((mac) => {
          const packet = Buffer.concat([
            Buffer.alloc(6, 255),
            ...Array.from({ length: 16 }, () => Buffer.from(mac, "hex")),
          ]);
          return [...destinations].map(
            (destination) =>
              new Promise<void>((done, fail) => {
                socket.send(packet, 9, destination, (error) => (error ? fail(error) : done()));
              }),
          );
        });
        void Promise.allSettled(sends).then((results) =>
          finish(
            results.some((result) => result.status === "fulfilled")
              ? undefined
              : new RokuError("Could not send the wake request.", "wake"),
          ),
        );
      } catch (error) {
        finish(
          error instanceof RokuError ? error : new RokuError("Could not send a wake request on this network.", "wake"),
        );
      }
    });
  });
}
