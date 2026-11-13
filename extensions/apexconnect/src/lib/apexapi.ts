import { showFailureToast } from "@raycast/utils";
import { LocalStorage } from "@raycast/api";
import urljoin from "url-join";
import fs from "fs";
import { Agent, Response, fetch } from "undici";
import { getWifiSSIDSync } from "./wifi";
import * as ping from "ping";
import { URL } from "url";
import { queryMdns } from "./mdns";
import { generateMobileDeviceRegistration, ApexMobileDeviceRegistrationResponse } from "./mobiledevice";
import { Connection } from "@apexinfosysindia/js-websocket";

function paramString(params: { [key: string]: string }): string {
  const p: string[] = [];
  for (const k in params) {
    const v = encodeURI(params[k]);
    p.push(`${k}=${v}`);
  }
  let prefix = "";
  if (p.length > 0) {
    prefix = "?";
  }
  return prefix + p.join("&");
}

export class State {
  public entity_id = "";
  public state = "";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public attributes: Record<string, any> = {};
  public last_updated = "";
  public last_changed = "";
}

export interface ApexConnectClientOptions {
  urlInternal?: string;
  wifiSSIDs?: string[];
  usePing?: boolean;
  preferCompanionApp?: boolean;
}

export class ApexConnectClient {
  public token: string;
  public url: string;
  public urlInternal: string | undefined;
  private _nearestURL: string | undefined;
  private _nearestURLCheckedAt = 0;
  private static readonly NEAREST_URL_TTL_MS = 60_000;
  private _ignoreCerts = false;
  public wifiSSIDs: string[] | undefined;
  private usePing = true;
  private messageSubscription?: object | null;
  public preferCompanionApp = false;

  constructor(
    url: string,
    token: string,
    ignoreCerts: boolean,
    options: ApexConnectClientOptions | undefined = undefined,
  ) {
    this.token = token;
    this.url = url;
    this.urlInternal = options?.urlInternal;
    this.wifiSSIDs = options?.wifiSSIDs;
    this.usePing = options?.usePing ?? true;
    this._ignoreCerts = ignoreCerts;
    this.preferCompanionApp = options?.preferCompanionApp === undefined ? false : options.preferCompanionApp;
  }

  private httpsDispatcher(url: string): Agent | undefined {
    if (url.startsWith("https://")) {
      return new Agent({
        connect: { rejectUnauthorized: !this._ignoreCerts },
      });
    }
  }

  public get ignoreCerts(): boolean {
    return this._ignoreCerts;
  }

  public urlJoin(text: string): string {
    const url = this._nearestURL && this._nearestURL.length > 0 ? this._nearestURL : this.url;
    return urljoin(url, text);
  }

  public navigateUrl(text: string) {
    if (this.preferCompanionApp) {
      return urljoin("apexconnect://navigate", text);
    }
    return this.urlJoin(text);
  }

  public isCompanionUrl(url: string) {
    return url.startsWith("apexconnect://");
  }

  private isHomeSSIDActive(): boolean {
    const ssid = getWifiSSIDSync();
    if (ssid) {
      if (this.wifiSSIDs && this.wifiSSIDs.includes(ssid)) {
        return true;
      }
    }
    return false;
  }

  private async pingHostSuccessful(url: string): Promise<boolean> {
    try {
      const u = new URL(url);
      const res = await ping.promise.probe(u.hostname, {
        timeout: 2,
        extra: ["-i", "1", "-c", "1"],
      });
      return res.alive;
    } catch (error) {
      return false;
    }
  }

  /**
   *
   * @returns The nearest reachable url including mDNS resolve when required
   */
  public async nearestURL(): Promise<string> {
    const url = await this.nearestDefinedURL();
    const urlParts = new URL(url);
    const hostname = urlParts.hostname;
    if (hostname.endsWith(".local")) {
      const mdnsHost = await queryMdns(hostname);
      if (mdnsHost) {
        return url.replace(hostname, mdnsHost);
      } else {
        throw Error(`Could not resolve mDNS address ${url}`);
      }
    }
    return url;
  }

  /**
   * @returns The nearest reachable url which is define in the preferences
   */
  public async nearestDefinedURL(): Promise<string> {
    // Cache the choice briefly rather than forever: a long-running menu bar
    // command whose Mac switches networks must eventually recheck which URL
    // is reachable instead of being stuck on the first answer.
    if (
      this._nearestURL &&
      this._nearestURL.length > 0 &&
      Date.now() - this._nearestURLCheckedAt < ApexConnectClient.NEAREST_URL_TTL_MS
    ) {
      return this._nearestURL;
    }
    if (!this.url || this.url.length <= 0) {
      throw Error("No Apex Connect Url defined");
    }
    if (this.urlInternal && this.urlInternal.length > 0) {
      if (this.isHomeSSIDActive()) {
        this._nearestURL = this.urlInternal;
        this._nearestURLCheckedAt = Date.now();
        return this.urlInternal;
      }
      if (this.usePing) {
        const res = await this.pingHostSuccessful(this.urlInternal);
        if (res) {
          this._nearestURL = this.urlInternal;
          this._nearestURLCheckedAt = Date.now();
          return this.urlInternal;
        }
      }
    }
    this._nearestURL = this.url;
    this._nearestURLCheckedAt = Date.now();
    return this._nearestURL;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public async fetch(url: string, params: { [key: string]: string } = {}): Promise<any> {
    const ps = paramString(params);
    const fullUrl = urljoin(await this.nearestURL(), "api", url + ps);
    try {
      const response = await fetch(fullUrl, {
        dispatcher: this.httpsDispatcher(fullUrl),
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.token}`,
        },
      });
      const json = await response.json();
      return json;
    } catch (error) {
      showFailureToast(error, { title: "Error" });
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public async post(url: string, params: { [key: string]: any } = {}): Promise<Response> {
    const fullUrl = urljoin(await this.nearestURL(), "api", url);
    const body = JSON.stringify(params);
    //try {
    const response = await fetch(fullUrl, {
      dispatcher: this.httpsDispatcher(fullUrl),
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.token}`,
      },
      body: body,
    });
    if (response.status < 200 || response.status >= 300) {
      throw new Error(`Status code ${response.status}`);
    }
    //} catch (e) {
    //}
    return response;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public async callService(domain: string, service: string, params: { [key: string]: any }): Promise<boolean> {
    const userparams = params;
    try {
      await this.post(`services/${domain}/${service}`, (params = userparams));
      return true;
    } catch (error) {
      showFailureToast(error);
      return false;
    }
  }

  async openCover(entityID: string): Promise<boolean> {
    return await this.callService("cover", "open_cover", { entity_id: entityID });
  }

  async closeCover(entityID: string): Promise<boolean> {
    return await this.callService("cover", "close_cover", { entity_id: entityID });
  }

  async toggleCover(entityID: string): Promise<boolean> {
    return await this.callService("cover", "toggle", { entity_id: entityID });
  }

  async stopCover(entityID: string): Promise<boolean> {
    return await this.callService("cover", "stop_cover", { entity_id: entityID });
  }

  async toggleFan(entityID: string): Promise<boolean> {
    return await this.callService("fan", "toggle", { entity_id: entityID });
  }

  async turnOnFan(entityID: string): Promise<boolean> {
    return await this.callService("fan", "turn_on", { entity_id: entityID });
  }

  async turnOffFan(entityID: string): Promise<boolean> {
    return await this.callService("fan", "turn_off", { entity_id: entityID });
  }

  async toggleLight(entityID: string): Promise<boolean> {
    return await this.callService("light", "toggle", { entity_id: entityID });
  }

  async turnOnLight(entityID: string): Promise<boolean> {
    return await this.callService("light", "turn_on", { entity_id: entityID });
  }

  async turnOffLight(entityID: string): Promise<boolean> {
    return await this.callService("light", "turn_off", { entity_id: entityID });
  }

  async playMedia(entityID: string): Promise<boolean> {
    return await this.callService("media_player", "media_play", { entity_id: entityID });
  }

  async playPauseMedia(entityID: string): Promise<boolean> {
    return await this.callService("media_player", "media_play_pause", { entity_id: entityID });
  }

  async nextMedia(entityID: string): Promise<boolean> {
    return await this.callService("media_player", "media_next_track", { entity_id: entityID });
  }

  async previousMedia(entityID: string): Promise<boolean> {
    return await this.callService("media_player", "media_previous_track", { entity_id: entityID });
  }

  async pauseMedia(entityID: string): Promise<boolean> {
    return await this.callService("media_player", "media_pause", { entity_id: entityID });
  }

  async stopMedia(entityID: string): Promise<boolean> {
    return await this.callService("media_player", "media_stop", { entity_id: entityID });
  }

  async volumeUpMedia(entityID: string): Promise<boolean> {
    return await this.callService("media_player", "volume_up", { entity_id: entityID });
  }

  async volumeDownMedia(entityID: string): Promise<boolean> {
    return await this.callService("media_player", "volume_down", { entity_id: entityID });
  }

  async muteMedia(entityID: string): Promise<boolean> {
    return await this.callService("media_player", "volume_mute", { entity_id: entityID, is_volume_muted: true });
  }

  async setVolumeLevelMedia(entityID: string, volumeLevel: number): Promise<boolean> {
    return await this.callService("media_player", "volume_set", { entity_id: entityID, volume_level: volumeLevel });
  }

  async selectSourceMedia(entityID: string, source: string): Promise<boolean> {
    return await this.callService("media_player", "select_source", { entity_id: entityID, source: source });
  }

  async setClimateTemperature(entityID: string, value: number): Promise<boolean> {
    return await this.callService("climate", "set_temperature", { entity_id: entityID, temperature: value });
  }

  async setClimateOperation(entityID: string, value: string): Promise<boolean> {
    return await this.callService("climate", "set_hvac_mode", { entity_id: entityID, hvac_mode: value });
  }

  async setClimatePreset(entityID: string, value: string): Promise<boolean> {
    let v: string | null = value;
    if (value === "None") {
      v = null;
    }
    return await this.callService("climate", "set_preset_mode", { entity_id: entityID, preset_mode: v });
  }

  async toggleSwitch(entityID: string): Promise<boolean> {
    return await this.callService("switch", "toggle", { entity_id: entityID });
  }

  async turnOnSwitch(entityID: string): Promise<boolean> {
    return await this.callService("switch", "turn_on", { entity_id: entityID });
  }

  async turnOffSwitch(entityID: string): Promise<boolean> {
    return await this.callService("switch", "turn_off", { entity_id: entityID });
  }

  async getStates(params: { domain: string; query: string }): Promise<State[]> {
    const items: State[] = await this.fetch("states");
    if (params) {
      let result = items;
      if (params.domain) {
        result = items.filter((e) => e.entity_id.startsWith(params.domain));
      }
      if (params.query) {
        result = result.filter(
          (e) =>
            e.entity_id.toLowerCase().includes(params.query.toLowerCase()) ||
            (e.attributes.friendly_name.toLowerCase() || "").includes(params.query.toLowerCase()),
        );
      }
      return result;
    }
    return items;
  }

  async downloadFile(url: string, params: { localFilepath: string }): Promise<string> {
    const fullUrl = urljoin(await this.nearestURL(), "api", url);
    // Snapshot endpoints (e.g. camera_proxy) can serve a stale cached frame
    // over a reused keep-alive connection; a dedicated one-shot dispatcher
    // forces a fresh connection so each call actually gets a new frame.
    const dispatcher = new Agent({
      connect: { rejectUnauthorized: !this._ignoreCerts },
      connections: 1,
      pipelining: 0,
    });
    try {
      const response = await fetch(fullUrl, {
        method: "GET",
        dispatcher,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.token}`,
          Connection: "close",
        },
      });
      if (!response.ok) {
        throw new Error(`unexpected response ${response.statusText}`);
      }
      const buffer = Buffer.from(await response.arrayBuffer());
      await fs.promises.writeFile(params.localFilepath, buffer);
      return params.localFilepath;
    } finally {
      await dispatcher.close();
    }
  }

  async getCameraProxyURL(entityID: string, localFilepath: string): Promise<void> {
    await this.downloadFile(`camera_proxy/${entityID}`, { localFilepath: localFilepath });
  }

  /**
   * The still-image snapshot endpoint (camera_proxy) can serve a cached frame
   * indefinitely; the backend only pulls fresh frames from the camera while an
   * MJPEG stream consumer is attached. Reopening a stream connection on every
   * poll makes some cameras/integrations stop responding for minutes, so this
   * keeps one connection open and hands every decoded JPEG frame to the
   * caller until `signal` aborts (or the stream itself ends/errors).
   */
  async readCameraStream(
    streamUrl: string,
    signal: AbortSignal,
    onFrame: (frame: Buffer) => void | Promise<void>,
  ): Promise<void> {
    const response = await fetch(streamUrl, {
      method: "GET",
      dispatcher: this.httpsDispatcher(streamUrl),
      signal,
    });
    if (!response.ok || !response.body) {
      throw new Error(`unexpected response ${response.statusText}`);
    }
    const reader = response.body.getReader();
    try {
      let acc = Buffer.alloc(0);
      for (;;) {
        const { done, value } = await reader.read();
        if (done) {
          if (signal.aborted) {
            return;
          }
          throw new Error("camera stream ended unexpectedly");
        }
        acc = Buffer.concat([acc, Buffer.from(value)]);
        for (;;) {
          const start = acc.indexOf(Buffer.from([0xff, 0xd8]));
          if (start === -1) {
            // No frame start buffered at all (just multipart boundary/header
            // bytes between frames) - that's never large, so drop it rather
            // than let it grow unbounded if a malformed stream never sends one.
            if (acc.length > 64 * 1024) {
              acc = Buffer.alloc(0);
            }
            break;
          }
          if (start > 0) {
            acc = acc.subarray(start);
          }
          const end = acc.indexOf(Buffer.from([0xff, 0xd9]), 2);
          if (end === -1) {
            // Frame started but hasn't finished arriving yet. Keep waiting -
            // a real JPEG can legitimately be several MB - but give up and
            // resync on the next start marker if it never completes.
            if (acc.length > 20 * 1024 * 1024) {
              acc = Buffer.alloc(0);
            }
            break;
          }
          await onFrame(acc.subarray(0, end + 2));
          acc = acc.subarray(end + 2);
        }
      }
    } finally {
      await reader.cancel().catch(() => undefined);
    }
  }

  async registerMobileDevice(con: Connection) {
    const registrationData = await generateMobileDeviceRegistration();
    let webhook_id = await LocalStorage.getItem<string>("webhook_id");
    if (!webhook_id || webhook_id.length <= 0) {
      const response = await this.post("mobile_app/registrations", registrationData);
      const data = (await response.json()) as ApexMobileDeviceRegistrationResponse;
      webhook_id = data.webhook_id;
      await LocalStorage.setItem("webhook_id", webhook_id);
    }

    if (!this.messageSubscription) {
      try {
        this.messageSubscription = await con.subscribeMessage(
          () => undefined,
          {
            type: "mobile_app/push_notification_channel",
            webhook_id: webhook_id,
            support_confirm: false,
          },
          { resubscribe: true },
        );
      } catch (error) {
        showFailureToast(error, { title: "Error" });
      }
    }
  }
}
