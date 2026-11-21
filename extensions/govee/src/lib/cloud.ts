import type { ColorInput } from "@j3lte/govee-lan-controller";
import { GoveeDeviceEventTypes } from "@j3lte/govee-lan-controller";
import { colord } from "colord";
import { EventEmitter } from "node:events";

/**
 * Govee Cloud API (https://developer.govee.com) support, for lights that
 * have no "LAN Control" (e.g. the H6009 bulb). Lights found on LAN keep
 * using LAN; the cloud is only used for the rest.
 */

const API = "https://openapi.api.govee.com/router/api/v1";

type Rgb = { r: number; g: number; b: number };

export type CloudDeviceInfo = {
  sku: string;
  device: string;
  deviceName: string;
  capabilities?: Array<{
    type: string;
    instance: string;
    parameters?: {
      options?: Array<{ name: string; value: number }>;
      fields?: Array<{
        fieldName: string;
        options?: Array<{ name?: string; value: number }>;
        elementRange?: { min: number; max: number };
        range?: { min: number; max: number };
      }>;
      range?: { min: number; max: number };
    };
  }>;
};

type StateCapability = { type: string; instance: string; state?: { value?: unknown } };

// Govee app groups. The Stream Deck plugin found the cloud ignores commands sent to these.
const VIRTUAL_SKUS = new Set(["BaseGroup", "SameModelGroup", "SameModeGroup"]);

let requestCounter = 0;
const requestId = () => `raycast-${Date.now()}-${++requestCounter}`;

/** Govee refused a request for its per-minute limit; `waitMs` is how long until it resets. */
export class RateLimitError extends Error {
  constructor(public waitMs: number) {
    super("Govee allows 10 commands per light per minute — wait a minute and try again");
  }
}

// API-RateLimit-Reset may be epoch seconds, epoch ms or seconds left; assume a full minute if missing.
const resetWait = (header: string | null) => {
  const n = Number(header);
  if (!header || !Number.isFinite(n) || n <= 0) return 60_000;
  const ms = n > 1e12 ? n - Date.now() : n > 1e9 ? n * 1000 - Date.now() : n * 1000;
  return Math.min(65_000, Math.max(1_000, ms + 500));
};

async function call<T>(apiKey: string, path: string, init?: { method?: string; body?: unknown }): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    method: init?.method ?? "GET",
    headers: { "Content-Type": "application/json", "Govee-API-Key": apiKey },
    body: init?.body ? JSON.stringify(init.body) : undefined,
  });
  const json = (await res.json().catch(() => ({}))) as { code?: number; message?: string; msg?: string } & T;
  if (!res.ok || (json.code !== undefined && json.code !== 200)) {
    const reason = json.message ?? json.msg ?? res.statusText;
    if (res.status === 401) throw new Error("Govee API key is invalid");
    if (res.status === 429) throw new RateLimitError(resetWait(res.headers.get("API-RateLimit-Reset")));
    throw new Error(`Govee cloud: ${reason || `HTTP ${res.status}`}`);
  }
  return json;
}

export async function fetchCloudDevices(apiKey: string): Promise<CloudDeviceInfo[]> {
  const { data } = await call<{ data?: CloudDeviceInfo[] }>(apiKey, "/user/devices");
  // Only things that behave like lights (have an on/off switch).
  const lights = (data ?? []).filter((d) =>
    (d.capabilities ?? []).some((c) => c.instance === "powerSwitch" || c.instance === "colorRgb"),
  );
  return lights;
}

/** Apply a snapshot without a device list, for snapshot quicklinks. */
export const applySnapshotDirect = (apiKey: string, sku: string, device: string, value: number) =>
  call(apiKey, "/device/control", {
    method: "POST",
    body: {
      requestId: requestId(),
      payload: { sku, device, capability: { type: "devices.capabilities.dynamic_scene", instance: "snapshot", value } },
    },
  });

/** Same id the LAN scan reports, compared without case. */
export const normalizeId = (id: string) => id.toLowerCase();

/**
 * Mimics the parts of the LAN library's `Device` that this extension uses,
 * so the rest of the code doesn't need to know which transport a light is on.
 */
export class CloudDevice extends EventEmitter {
  readonly id: string;
  readonly name: string;
  readonly model: string;
  readonly ipAddr = "Cloud";
  readonly isCloud = true;
  /** App groups / DreamView: not one physical light. */
  readonly isVirtual: boolean;
  /** Has its own brightness and colour worth showing. */
  readonly showLevels: boolean;
  /** Snapshots saved in the Govee app for this light (cloud only). */
  readonly snapshots: Array<{ name: string; value: number }>;
  /** Music modes the light offers (cloud only), e.g. Energic, Calm. */
  readonly musicModes: Array<{ name: string; value: number }>;
  /** Segment numbers for per-segment colour, e.g. 0–14 on a 15-segment strip; empty if unsupported. */
  readonly segments: number[];
  /** White temperature range in kelvin, if the light has a temperature mode. */
  readonly kelvinRange: { min: number; max: number } | null;
  /** Settles once the first state read is done (or failed), for callers that must wait for it. */
  readonly loaded: Promise<void>;

  private state = { onOff: false, brightness: 0, color: { r: 0, g: 0, b: 0 } as Rgb, kelvin: 0 };

  constructor(
    private readonly apiKey: string,
    info: CloudDeviceInfo,
  ) {
    super();
    this.id = info.device;
    this.name = info.deviceName || info.sku;
    this.model = info.sku;
    this.isVirtual = VIRTUAL_SKUS.has(info.sku) || info.sku.startsWith("DreamView");
    const caps = new Set((info.capabilities ?? []).map((c) => c.instance));
    this.showLevels = !this.isVirtual && caps.has("brightness") && caps.has("colorRgb");
    this.snapshots = info.capabilities?.find((c) => c.instance === "snapshot")?.parameters?.options ?? [];
    const capability = (instance: string) => info.capabilities?.find((c) => c.instance === instance);
    // Govee describes the segment field either as a min–max range or as a list of options.
    const segmentField = capability("segmentedColorRgb")?.parameters?.fields?.find((f) => f.fieldName === "segment");
    const range = segmentField?.elementRange;
    this.segments = range
      ? Array.from({ length: Math.max(0, range.max - range.min + 1) }, (_, i) => range.min + i)
      : (segmentField?.options ?? []).map((o) => o.value);
    this.kelvinRange = capability("colorTemperatureK")?.parameters?.range ?? null;
    this.musicModes = (info.capabilities
      ?.find((c) => c.instance === "musicMode")
      ?.parameters?.fields?.find((f) => f.fieldName === "musicMode")?.options ?? []) as Array<{
      name: string;
      value: number;
    }>;
    // Read the state once, in the background; no polling (cloud rate limits).
    this.loaded = this.refresh().catch(() => undefined);
  }

  get isOn() {
    return this.state.onOff;
  }
  get brightness() {
    return this.state.brightness;
  }
  get color() {
    return this.state.color;
  }
  get colorTemperature() {
    return this.state.kelvin;
  }

  private emitState() {
    const now = Date.now();
    this.emit(GoveeDeviceEventTypes.StateChange, {
      ...this.state,
      info: { lastUpdate: now, lastStateChange: now, lastChanged: "color" },
    });
  }

  async refresh() {
    const res = await call<{ payload?: { capabilities?: StateCapability[] } }>(this.apiKey, "/device/state", {
      method: "POST",
      body: { requestId: requestId(), payload: { sku: this.model, device: this.id } },
    });
    for (const cap of res.payload?.capabilities ?? []) {
      const value = cap.state?.value;
      if (cap.instance === "powerSwitch" && typeof value === "number") this.state.onOff = value === 1;
      if (cap.instance === "brightness" && typeof value === "number") this.state.brightness = value;
      if (cap.instance === "colorTemperatureK" && typeof value === "number") this.state.kelvin = value;
      if (cap.instance === "colorRgb" && typeof value === "number") {
        this.state.color = { r: (value >> 16) & 0xff, g: (value >> 8) & 0xff, b: value & 0xff };
      }
    }
    this.emitState();
  }

  private async control(type: string, instance: string, value: unknown) {
    await call(this.apiKey, "/device/control", {
      method: "POST",
      body: {
        requestId: requestId(),
        payload: { sku: this.model, device: this.id, capability: { type, instance, value } },
      },
    });
  }

  async applySnapshot(value: number) {
    await this.control("devices.capabilities.dynamic_scene", "snapshot", value);
    this.state.onOff = true;
    this.emitState();
  }

  async setSegmentsColor(segments: number[], hex: string) {
    const { r, g, b } = colord(hex).toRgb();
    await this.control("devices.capabilities.segment_color_setting", "segmentedColorRgb", {
      segment: segments,
      rgb: (r << 16) + (g << 8) + b,
    });
  }

  async setColorTemperature(kelvin: number) {
    await this.control("devices.capabilities.color_setting", "colorTemperatureK", Math.round(kelvin));
    // Show the white on the row right away (the light reports it as black RGB + kelvin).
    this.state = { ...this.state, onOff: true, color: { r: 0, g: 0, b: 0 }, kelvin: Math.round(kelvin) };
    this.emitState();
  }

  async setMusicMode(mode: number, sensitivity: number) {
    await this.control("devices.capabilities.music_setting", "musicMode", { musicMode: mode, sensitivity });
    this.state.onOff = true;
    this.emitState();
  }

  async turnOn() {
    await this.control("devices.capabilities.on_off", "powerSwitch", 1);
    this.state.onOff = true;
    this.emitState();
  }

  async turnOff() {
    await this.control("devices.capabilities.on_off", "powerSwitch", 0);
    this.state.onOff = false;
    this.emitState();
  }

  async setBrightness(brightness: number) {
    const value = Math.max(1, Math.min(100, Math.round(brightness)));
    await this.control("devices.capabilities.range", "brightness", value);
    this.state.brightness = value;
    this.emitState();
  }

  async setColor(input: ColorInput, brightness?: number | null) {
    const { r, g, b } = colord(input as Parameters<typeof colord>[0]).toRgb();
    await this.control("devices.capabilities.color_setting", "colorRgb", (r << 16) + (g << 8) + b);
    this.state = { ...this.state, onOff: true, color: { r, g, b }, kelvin: 0 };
    this.emitState();
    if (typeof brightness === "number") await this.setBrightness(brightness);
  }

  /** Commands above already update the local state; nothing to wait for. */
  async sync() {}
  async waitForFirstUpdate() {}
}
