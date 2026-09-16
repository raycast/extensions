import https from "node:https";
import fetch, { type RequestInit, type Response } from "node-fetch";
import { getResourceDefinition, type ResourceContext, type ResourceKey, type UniFiService } from "./resources";
import type {
  FirewallPolicy,
  JsonObject,
  NetworkClient,
  NetworkDefinition,
  NetworkDevice,
  NetworkDeviceDetails,
  NetworkDeviceStatistics,
  NetworkOverview,
  Page,
  ProtectEntity,
  ProtectNvr,
  ProtectOverview,
  Site,
  WanInterface,
  WifiBroadcast,
} from "./types";
import { getUniFiPreferences, type UniFiPreferences } from "./preferences";

const CLOUD_API_ORIGIN = "https://api.ui.com";
const DEFAULT_TIMEOUT_MS = 10_000;
const PAGE_SIZE = 200;
const MAX_PAGES = 100;

type Fetch = (url: string, init?: RequestInit) => Promise<Response>;
type Wait = (milliseconds: number) => Promise<void>;

export interface UniFiClientConfig extends UniFiPreferences {
  fetch?: Fetch;
  timeoutMs?: number;
  wait?: Wait;
}

interface RequestOptions {
  body?: unknown;
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  responseType?: "json" | "buffer";
  retries?: number;
  signal?: AbortSignal;
}

export class UniFiError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
    public readonly traceId?: string,
  ) {
    super(traceId ? `${message} (Trace ID: ${traceId})` : message);
    this.name = "UniFiError";
  }
}

function isPrivateHostname(hostname: string): boolean {
  const host = hostname.toLowerCase();
  if (host === "localhost" || host === "::1" || host.endsWith(".local")) return true;
  const parts = host.split(".").map(Number);
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return false;
  return (
    parts[0] === 10 ||
    parts[0] === 127 ||
    (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) ||
    (parts[0] === 192 && parts[1] === 168) ||
    (parts[0] === 100 && parts[1] >= 64 && parts[1] <= 127)
  );
}

export function normalizeControllerUrl(value?: string): string {
  const raw = value?.trim();
  if (!raw) throw new UniFiError("Controller URL is required in Local Console mode.");

  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new UniFiError("Controller URL must be a valid http or https URL.");
  }

  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new UniFiError("Controller URL must use http or https.");
  }
  if (url.username || url.password || url.search || url.hash) {
    throw new UniFiError("Controller URL must not contain credentials, query parameters, or a fragment.");
  }
  if (url.protocol === "http:" && !isPrivateHostname(url.hostname)) {
    throw new UniFiError("Plain HTTP is allowed only for localhost or private network addresses.");
  }

  return url.origin;
}

export function buildServiceBaseUrl(
  service: UniFiService,
  config: Pick<UniFiPreferences, "connectionMode" | "consoleId" | "controllerUrl">,
): string {
  if (service === "site-manager" || service === "mobility" || service === "carrier-fabric") {
    return CLOUD_API_ORIGIN;
  }

  if (config.connectionMode === "cloud") {
    const consoleId = config.consoleId?.trim();
    if (!consoleId) throw new UniFiError("Cloud Console ID is required for this resource in Cloud Connector mode.");
    return `${CLOUD_API_ORIGIN}/v1/connector/consoles/${encodeURIComponent(consoleId)}/proxy/${service}/integration`;
  }

  return `${normalizeControllerUrl(config.controllerUrl)}/proxy/${service}/integration`;
}

function appendQuery(path: string, values: Record<string, string | number | undefined>): string {
  const [pathname, existingQuery] = path.split("?", 2);
  const params = new URLSearchParams(existingQuery);
  for (const [name, value] of Object.entries(values)) {
    if (value !== undefined) params.set(name, String(value));
  }
  const query = params.toString();
  return query ? `${pathname}?${query}` : pathname;
}

function asMessage(payload: unknown): { message?: string; traceId?: string } {
  if (!payload || typeof payload !== "object") return {};
  const record = payload as Record<string, unknown>;
  const message =
    (typeof record.message === "string" && record.message) ||
    (typeof record.error === "string" && record.error) ||
    (typeof record.code === "string" && record.code) ||
    undefined;
  return { message, traceId: typeof record.traceId === "string" ? record.traceId : undefined };
}

function normalizeCollection(payload: unknown): JsonObject[] {
  if (Array.isArray(payload))
    return payload.filter((item): item is JsonObject => Boolean(item && typeof item === "object"));
  if (!payload || typeof payload !== "object") return [];

  const record = payload as Record<string, unknown>;
  if (Array.isArray(record.data)) {
    return record.data.filter((item): item is JsonObject => Boolean(item && typeof item === "object"));
  }
  if (record.data && typeof record.data === "object") return [record.data as JsonObject];
  return [record as JsonObject];
}

function requireIntegerInRange(value: number | undefined, label: string, minimum: number, maximum?: number): void {
  if (value === undefined) return;
  if (!Number.isInteger(value) || value < minimum || (maximum !== undefined && value > maximum)) {
    const range = maximum === undefined ? `${minimum} or greater` : `${minimum} through ${maximum}`;
    throw new UniFiError(`${label} must be an integer from ${range}.`);
  }
}

export class UniFiClient {
  private readonly apiKey: string;
  private readonly config: UniFiClientConfig;
  private readonly fetch: Fetch;
  private readonly timeoutMs: number;
  private readonly wait: Wait;

  constructor(config: UniFiClientConfig) {
    this.apiKey = config.apiKey?.trim();
    if (!this.apiKey) throw new UniFiError("UniFi API Key is required.");
    this.config = config;
    this.fetch = config.fetch ?? fetch;
    this.timeoutMs = config.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.wait = config.wait ?? ((milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds)));
  }

  static fromPreferences(): UniFiClient {
    return new UniFiClient(getUniFiPreferences());
  }

  private async request<T>(service: UniFiService, path: string, options: RequestOptions = {}): Promise<T> {
    const method = options.method ?? "GET";
    const retries = method === "GET" ? (options.retries ?? 2) : 0;
    const baseUrl = buildServiceBaseUrl(service, this.config);
    const url = `${baseUrl}${path.startsWith("/") ? path : `/${path}`}`;
    const timeoutController = new AbortController();
    const timeout = setTimeout(() => timeoutController.abort(), this.timeoutMs);
    const signal = options.signal
      ? AbortSignal.any([options.signal, timeoutController.signal])
      : timeoutController.signal;
    const isLocal =
      this.config.connectionMode === "local" && !["site-manager", "mobility", "carrier-fabric"].includes(service);
    const agent =
      isLocal && url.startsWith("https:")
        ? new https.Agent({ keepAlive: true, rejectUnauthorized: this.config.verifyTlsCertificates === true })
        : undefined;

    try {
      const response = await this.fetch(url, {
        agent,
        body: options.body === undefined ? undefined : JSON.stringify(options.body),
        headers: {
          Accept: options.responseType === "buffer" ? "image/jpeg" : "application/json",
          ...(options.body === undefined ? {} : { "Content-Type": "application/json" }),
          "X-API-Key": this.apiKey,
        },
        method,
        signal,
      });

      if (!response.ok) {
        if (retries > 0 && (response.status === 429 || response.status >= 500)) {
          const retryAfter = Number(response.headers.get("retry-after"));
          const delay = Number.isFinite(retryAfter) ? retryAfter * 1000 : 250 * 2 ** (2 - retries);
          await response.arrayBuffer();
          await this.wait(Math.min(delay, 5_000));
          return this.request<T>(service, path, { ...options, retries: retries - 1 });
        }

        let payload: unknown;
        try {
          payload = await response.json();
        } catch {
          payload = undefined;
        }
        const details = asMessage(payload);
        throw new UniFiError(
          details.message || `UniFi returned HTTP ${response.status}.`,
          response.status,
          details.traceId,
        );
      }

      if (response.status === 204) return undefined as T;
      if (options.responseType === "buffer") {
        const buffer = Buffer.from(await response.arrayBuffer());
        return buffer as T;
      }
      return (await response.json()) as T;
    } catch (error) {
      if (error instanceof UniFiError) throw error;
      if (error instanceof Error && error.name === "AbortError") {
        if (options.signal?.aborted) throw error;
        throw new UniFiError(`UniFi request timed out after ${this.timeoutMs / 1000} seconds.`);
      }
      throw new UniFiError(error instanceof Error ? error.message : "UniFi request failed.");
    } finally {
      clearTimeout(timeout);
    }
  }

  private async listPage<T>(path: string, signal?: AbortSignal): Promise<T[]> {
    const results: T[] = [];
    let offset = 0;

    for (let pageNumber = 0; pageNumber < MAX_PAGES; pageNumber += 1) {
      const page = await this.request<Page<T>>("network", appendQuery(path, { limit: PAGE_SIZE, offset }), { signal });
      results.push(...page.data);
      if (page.data.length === 0 || results.length >= page.totalCount) return results;
      offset += page.data.length;
    }

    throw new UniFiError(`UniFi pagination exceeded ${MAX_PAGES} pages.`);
  }

  async listSites(signal?: AbortSignal): Promise<Site[]> {
    return this.listPage<Site>("/v1/sites", signal);
  }

  async listDevices(siteId: string, signal?: AbortSignal): Promise<NetworkDevice[]> {
    return this.listPage<NetworkDevice>(`/v1/sites/${encodeURIComponent(siteId)}/devices`, signal);
  }

  async getDevice(siteId: string, deviceId: string, signal?: AbortSignal): Promise<NetworkDeviceDetails> {
    return this.request<NetworkDeviceDetails>(
      "network",
      `/v1/sites/${encodeURIComponent(siteId)}/devices/${encodeURIComponent(deviceId)}`,
      { signal },
    );
  }

  async getDeviceStatistics(siteId: string, deviceId: string, signal?: AbortSignal): Promise<NetworkDeviceStatistics> {
    return this.request<NetworkDeviceStatistics>(
      "network",
      `/v1/sites/${encodeURIComponent(siteId)}/devices/${encodeURIComponent(deviceId)}/statistics/latest`,
      { signal },
    );
  }

  async listClients(siteId: string, signal?: AbortSignal): Promise<NetworkClient[]> {
    return this.listPage<NetworkClient>(`/v1/sites/${encodeURIComponent(siteId)}/clients`, signal);
  }

  async listNetworks(siteId: string, signal?: AbortSignal): Promise<NetworkDefinition[]> {
    return this.listPage<NetworkDefinition>(`/v1/sites/${encodeURIComponent(siteId)}/networks`, signal);
  }

  async listWifiBroadcasts(siteId: string, signal?: AbortSignal): Promise<WifiBroadcast[]> {
    return this.listPage<WifiBroadcast>(`/v1/sites/${encodeURIComponent(siteId)}/wifi/broadcasts`, signal);
  }

  async listFirewallPolicies(siteId: string, signal?: AbortSignal): Promise<FirewallPolicy[]> {
    return this.listPage<FirewallPolicy>(`/v1/sites/${encodeURIComponent(siteId)}/firewall/policies`, signal);
  }

  async listWans(siteId: string, signal?: AbortSignal): Promise<WanInterface[]> {
    return this.listPage<WanInterface>(`/v1/sites/${encodeURIComponent(siteId)}/wans`, signal);
  }

  async getNetworkOverview(site: Site, signal?: AbortSignal): Promise<NetworkOverview> {
    const [devices, clients, networks, wifiBroadcasts, firewallPolicies, wans] = await Promise.all([
      this.listDevices(site.id, signal),
      this.listClients(site.id, signal),
      this.listNetworks(site.id, signal),
      this.listWifiBroadcasts(site.id, signal),
      this.listFirewallPolicies(site.id, signal),
      this.listWans(site.id, signal),
    ]);
    return { clients, devices, firewallPolicies, networks, site, wans, wifiBroadcasts };
  }

  async listResource(
    key: ResourceKey | string,
    context: ResourceContext = {},
    signal?: AbortSignal,
  ): Promise<JsonObject[]> {
    const definition = getResourceDefinition(key);
    const path = definition.path(context);
    if (definition.service === "network") {
      return this.listPage<JsonObject>(path, signal);
    }
    const payload = await this.request<unknown>(definition.service, path, { signal });
    return normalizeCollection(payload);
  }

  async getProtectOverview(signal?: AbortSignal): Promise<ProtectOverview> {
    const resources = [
      "protect-cameras",
      "protect-sensors",
      "protect-lights",
      "protect-sirens",
      "protect-chimes",
      "protect-viewers",
      "protect-liveviews",
      "protect-arm-profiles",
      "protect-fobs",
      "protect-relays",
      "protect-speakers",
      "protect-bridges",
      "protect-link-stations",
      "protect-alarm-hubs",
      "protect-nvr",
    ] as const;
    const settled = await Promise.allSettled(resources.map((resource) => this.listResource(resource, {}, signal)));
    const collections: Record<string, ProtectEntity[]> = {};
    const unavailable: ProtectOverview["unavailable"] = [];
    let nvr: ProtectNvr | undefined;

    settled.forEach((result, index) => {
      const resource = resources[index];
      if (result.status === "rejected") {
        unavailable.push({
          resource,
          reason: result.reason instanceof Error ? result.reason.message : "Unavailable",
        });
        return;
      }
      if (resource === "protect-nvr") nvr = result.value[0] as ProtectNvr | undefined;
      else collections[resource] = result.value as ProtectEntity[];
    });

    return { collections, nvr, unavailable };
  }

  async getCameraSnapshot(cameraId: string, highQuality = true): Promise<Buffer> {
    return this.request<Buffer>(
      "protect",
      appendQuery(`/v1/cameras/${encodeURIComponent(cameraId)}/snapshot`, { highQuality: String(highQuality) }),
      { responseType: "buffer" },
    );
  }

  async restartNetworkDevice(siteId: string, deviceId: string): Promise<void> {
    await this.request(
      "network",
      `/v1/sites/${encodeURIComponent(siteId)}/devices/${encodeURIComponent(deviceId)}/actions`,
      {
        body: { action: "RESTART" },
        method: "POST",
      },
    );
  }

  async powerCyclePort(siteId: string, deviceId: string, portIndex: number): Promise<void> {
    await this.request(
      "network",
      `/v1/sites/${encodeURIComponent(siteId)}/devices/${encodeURIComponent(deviceId)}/interfaces/ports/${portIndex}/actions`,
      { body: { action: "POWER_CYCLE" }, method: "POST" },
    );
  }

  async controlProtect(input: {
    action:
      | "play-siren"
      | "stop-siren"
      | "test-siren"
      | "ptz-goto"
      | "ptz-patrol-start"
      | "ptz-patrol-stop"
      | "activate-relay"
      | "trigger-alarm-hub"
      | "arm"
      | "disarm";
    deviceId?: string;
    delay?: number;
    duration?: number;
    enable?: boolean;
    outputId?: number;
    slot?: number;
    volume?: number;
  }): Promise<void> {
    const normalizedDeviceId = input.deviceId?.trim();
    const deviceId = normalizedDeviceId ? encodeURIComponent(normalizedDeviceId) : undefined;
    switch (input.action) {
      case "play-siren":
        if (!deviceId) throw new UniFiError("A Protect siren ID is required.");
        if (input.duration !== undefined && ![5, 10, 20, 30].includes(input.duration)) {
          throw new UniFiError("Siren duration must be 5, 10, 20, or 30 seconds.");
        }
        await this.request("protect", `/v1/sirens/${deviceId}/play`, {
          body: input.duration === undefined ? undefined : { duration: input.duration },
          method: "POST",
        });
        return;
      case "stop-siren":
        if (!deviceId) throw new UniFiError("A Protect siren ID is required.");
        await this.request("protect", `/v1/sirens/${deviceId}/stop`, { method: "POST" });
        return;
      case "test-siren":
        if (!deviceId) throw new UniFiError("A Protect siren ID is required.");
        requireIntegerInRange(input.volume, "Siren volume", 1, 100);
        await this.request("protect", `/v1/sirens/${deviceId}/test-sound`, {
          body: input.volume === undefined ? undefined : { volume: input.volume },
          method: "POST",
        });
        return;
      case "ptz-goto":
      case "ptz-patrol-start": {
        if (!deviceId) throw new UniFiError("A Protect camera ID is required.");
        if (input.slot === undefined) throw new UniFiError("A PTZ preset or patrol slot is required.");
        requireIntegerInRange(
          input.slot,
          input.action === "ptz-goto" ? "PTZ preset slot" : "PTZ patrol slot",
          input.action === "ptz-goto" ? -1 : 0,
          input.action === "ptz-goto" ? undefined : 4,
        );
        const action = input.action === "ptz-goto" ? `goto/${input.slot}` : `patrol/start/${input.slot}`;
        await this.request("protect", `/v1/cameras/${deviceId}/ptz/${action}`, { method: "POST" });
        return;
      }
      case "ptz-patrol-stop":
        if (!deviceId) throw new UniFiError("A Protect camera ID is required.");
        await this.request("protect", `/v1/cameras/${deviceId}/ptz/patrol/stop`, { method: "POST" });
        return;
      case "activate-relay":
        if (!deviceId) throw new UniFiError("A Protect relay ID is required.");
        if (input.outputId === undefined) throw new UniFiError("A relay output ID is required.");
        requireIntegerInRange(input.outputId, "Relay output ID", 0, 1);
        requireIntegerInRange(input.duration, "Relay pulse duration", 0);
        await this.request("protect", `/v1/relays/${deviceId}/outputs/${input.outputId}/activate`, {
          body:
            input.enable === undefined
              ? undefined
              : { state: input.enable ? "on" : "off", pulseDuration: input.duration },
          method: "POST",
        });
        return;
      case "trigger-alarm-hub":
        if (!deviceId) throw new UniFiError("A Protect alarm hub ID is required.");
        if (input.outputId === undefined) throw new UniFiError("An alarm hub output ID is required.");
        requireIntegerInRange(input.outputId, "Alarm hub output ID", 0, 1);
        requireIntegerInRange(input.delay, "Alarm hub delay", 0);
        requireIntegerInRange(input.duration, "Alarm hub duration", 0);
        await this.request("protect", `/v1/alarm-hubs/${deviceId}/outputs/${input.outputId}/trigger`, {
          body: { delay: input.delay, duration: input.duration, enable: input.enable },
          method: "POST",
        });
        return;
      case "arm":
        await this.request("protect", "/v1/arm-profiles/enable", { method: "POST" });
        return;
      case "disarm":
        await this.request("protect", "/v1/arm-profiles/disable", { method: "POST" });
    }
  }

  getDashboardUrl(site?: Site): string {
    if (this.config.connectionMode === "cloud") return "https://unifi.ui.com";
    const origin = normalizeControllerUrl(this.config.controllerUrl);
    return `${origin}/network/${encodeURIComponent(site?.internalReference || "default")}/dashboard`;
  }
}
