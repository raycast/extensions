import https from "https";
import fetch, { HeadersInit, RequestInit } from "node-fetch";
import type { Client, Clients } from "./types/client";
import type { Device, DeviceActions, Devices, DeviceStats, ListDevice, ListDevices } from "./types/device";
import type { ApiResponse } from "./types/response";
import type { Site, Sites } from "./types/site";
import { assignUplinkDevice } from "../utils";

class UnifiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "UnifiError";
  }
}

interface RequestOptions extends RequestInit {
  timeout?: number;
  retries?: number;
}

interface UnifiConfig {
  host?: string;
  apiKey: string;
  site?: string;
  remote?: boolean;
}

const PUBLIC_API_URL = "https://unifi.ui.com";
const LOCAL_API_SUFFIX = "/proxy/network";
const URL_SUFFIX = "/integration/v1/";
const DEVICE_WEB_SUFFIX = "/network/default/devices/properties/{macAddress}";
const DASHBOARD_SUFFIX = "/network/default/dashboard";

export class UnifiClient {
  private readonly host: string;
  private readonly baseURL: string;
  private readonly headers: HeadersInit;
  private readonly agent: https.Agent;
  private readonly timeout = 10000; // 10s default timeout
  private readonly maxRetries = 3;
  private site?: string;
  private remote: boolean;

  constructor({ host = "https://192.168.1.1", apiKey, remote = false, site }: UnifiConfig) {
    if (!apiKey) throw new Error("API key is required");

    this.host = host;
    this.remote = remote;
    this.baseURL = remote ? `${PUBLIC_API_URL}${URL_SUFFIX}` : `${host}${LOCAL_API_SUFFIX}${URL_SUFFIX}`;
    this.site = site;
    this.headers = {
      "Content-Type": "application/json",
      "X-API-Key": apiKey,
    };
    this.agent = new https.Agent({
      rejectUnauthorized: remote,
      keepAlive: true,
    });
  }

  private async request<T>(path: string, options: RequestOptions = {}, noResponse?: boolean): Promise<T> {
    const controller = new AbortController();
    const timeout = setTimeout(() => {
      controller.abort();
    }, options.timeout || this.timeout);

    try {
      const url = `${this.baseURL}${path}`;
      console.log(`[UnifiClient] ${options.method || "GET"} ${url}`);

      const response = await fetch(url, {
        ...options,
        headers: {
          ...this.headers,
          ...options.headers,
        },
        agent: this.agent,
        signal: controller.signal,
      });

      if (noResponse) return response.ok as T;

      if (!response.ok) {
        throw new UnifiError(response.status, `HTTP error! status: ${response.status}`);
      }

      return response.json() as T;
    } catch (error) {
      if (options.retries && options.retries > 0) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        return this.request<T>(
          path,
          {
            ...options,
            retries: options.retries - 1,
          },
          noResponse,
        );
      }
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }

  private ensureSite() {
    if (!this.site) {
      throw new UnifiError(400, "Site not set");
    }
  }

  isSiteSet(): boolean {
    return !!this.site;
  }

  SetSite(site: string) {
    this.site = site;
  }

  SetRemote(remote: boolean) {
    this.remote = remote;
  }

  async GetSites(abortable?: AbortController): Promise<Sites> {
    const sites = await this.request<ApiResponse<Site>>("sites", {
      retries: this.maxRetries,
      signal: abortable?.signal,
    });
    return sites.data;
  }

  async GetClients(abortable?: AbortController): Promise<Clients> {
    this.ensureSite();
    const clients = await this.request<ApiResponse<Client>>(`sites/${this.site}/clients?limit=1000`, {
      retries: this.maxRetries,
      signal: abortable?.signal,
    });
    return clients.data;
  }

  async GetDevices(abortable?: AbortController): Promise<ListDevices> {
    this.ensureSite();
    const devices = await this.request<ApiResponse<ListDevice>>(`sites/${this.site}/devices?limit=1000`, {
      signal: abortable?.signal,
    });

    return devices.data;
  }

  async GetDevice(deviceId: string, signal?: AbortSignal): Promise<Device> {
    try {
      this.ensureSite();
    } catch (error) {
      return {} as Device;
    }
    const device = await this.request<Device>(`sites/${this.site}/devices/${deviceId}`, { signal });
    if (!device) {
      throw new UnifiError(404, "Device not found");
    }

    return device;
  }

  async GetDevicesFull(abortable: AbortController): Promise<Devices> {
    this.ensureSite();
    const fullDevices: Devices = [];
    try {
      const devices = await this.GetDevices(abortable);

      for (const device of devices) {
        const fullDevice = await this.GetDevice(device.id, abortable?.signal);
        fullDevices.push(assignUplinkDevice(fullDevice, devices));
      }
    } catch (error) {
      return fullDevices;
    }

    return fullDevices;
  }

  async DeviceAction(deviceId: string, action: DeviceActions): Promise<boolean> {
    this.ensureSite();

    const resp = await this.request<boolean>(
      `sites/${this.site}/devices/${deviceId}/actions`,
      {
        method: "POST",
        body: JSON.stringify({ action }),
      },
      true,
    );

    if (resp) {
      return true;
    } else {
      throw new UnifiError(500, "Failed to restart device");
    }
  }

  async GetDeviceStats(deviceId: string, signal?: AbortSignal): Promise<DeviceStats> {
    this.ensureSite();
    const stats = await this.request<DeviceStats>(`sites/${this.site}/devices/${deviceId}/statistics/latest`, {
      signal,
    });
    return stats;
  }

  GetDeviceUrl(macAddress: string): string {
    if (!macAddress) return "";

    return `${this.host}${DEVICE_WEB_SUFFIX.replace("{macAddress}", macAddress)}`;
  }

  GetDashboardUrl(): string {
    return `${this.host}${DASHBOARD_SUFFIX}`;
  }
}

export const GetDashboardUrl = (host: string): string => {
  return `${host}${DASHBOARD_SUFFIX}`;
};
