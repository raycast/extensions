import { showToast, Toast } from "@raycast/api";
import fetch from "node-fetch";
import urljoin from "url-join";
import { getErrorMessage } from "./utils";
import fs from "fs";
import { pipeline } from "stream";
import util from "util";
import { Agent } from "https";
import { getWifiSSIDSync } from "./lib/wifi";
import * as ping from "ping";
import { URL } from "url";
import { queryMdns } from "./lib/mdns";
const streamPipeline = util.promisify(pipeline);

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

export interface HomeAssistantOptions {
  urlInternal?: string;
  wifiSSIDs?: string[];
  usePing?: boolean;
}

export class HomeAssistant {
  public token: string;
  public url: string;
  public urlInternal: string | undefined;
  private _nearestURL: string | undefined;
  private httpsAgent?: Agent;
  private _ignoreCerts = false;
  public wifiSSIDs: string[] | undefined;
  private usePing = true;

  constructor(url: string, token: string, ignoreCerts: boolean, options: HomeAssistantOptions | undefined = undefined) {
    this.token = token;
    this.url = url;
    this.urlInternal = options?.urlInternal;
    this.wifiSSIDs = options?.wifiSSIDs;
    this.usePing = options?.usePing ?? true;
    this._ignoreCerts = ignoreCerts;
    if (this.url.startsWith("https://")) {
      this.httpsAgent = new Agent({
        rejectUnauthorized: !ignoreCerts,
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

  private isHomeSSIDActive(): boolean {
    const ssid = getWifiSSIDSync();
    if (ssid) {
      console.log("Current SSID: ", ssid);
      if (!this.wifiSSIDs || this.wifiSSIDs.length <= 0) {
        console.log("No WiFi SSIDs are specified for the internal url");
      }
      if (this.wifiSSIDs && this.wifiSSIDs.includes(ssid)) {
        return true;
      } else {
        console.log(
          `Current SSID (${ssid}) is not in home network list (${
            this.wifiSSIDs && this.wifiSSIDs.length > 0 ? this.wifiSSIDs.join(", ") : "No SSIDS defined"
          })`
        );
      }
    }
    return false;
  }

  private async pingHostSuccessful(url: string): Promise<boolean> {
    try {
      const u = new URL(url);
      console.log(`ping ${u.hostname}`);
      const res = await ping.promise.probe(u.hostname, {
        timeout: 2,
        extra: ["-i", "1", "-c", "1"],
      });
      console.log(res);
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
    if (this._nearestURL && this._nearestURL.length > 0) {
      return this._nearestURL;
    }
    if (!this.url || this.url.length <= 0) {
      throw Error("No Home Assistant Url defined");
    }
    if (this.urlInternal && this.urlInternal.length > 0) {
      if (this.isHomeSSIDActive()) {
        console.log("Current SSID is Home Network");
        this._nearestURL = this.urlInternal;
        return this.urlInternal;
      }
      if (this.usePing) {
        const res = await this.pingHostSuccessful(this.urlInternal);
        if (res) {
          console.log(`ping to internal host ${this.urlInternal} successful`);
          this._nearestURL = this.urlInternal;
          return this.urlInternal;
        } else {
          console.log(`internal host ${this.urlInternal} is not pingable`);
        }
      }
    }
    this._nearestURL = this.url;
    return this._nearestURL;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public async fetch(url: string, params: { [key: string]: string } = {}): Promise<any> {
    const ps = paramString(params);
    const fullUrl = urljoin(this.url, "api", url + ps);
    console.log(`send GET request: ${fullUrl}`);
    try {
      const response = await fetch(fullUrl, {
        agent: this.httpsAgent,
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.token}`,
        },
      });
      const json = await response.json();
      console.log("JJJ");
      return json;
    } catch (error) {
      console.log(error);
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public async post(url: string, params: { [key: string]: any } = {}): Promise<null> {
    const fullUrl = this.url + "/api/" + url;
    console.log(`send POST request: ${fullUrl}`);
    const body = JSON.stringify(params);
    console.log(body);
    //try {
    const response = await fetch(fullUrl, {
      agent: this.httpsAgent,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.token}`,
      },
      body: body,
    });
    console.log(`status: ${response.status}`);
    if (response.status < 200 || response.status >= 300) {
      throw new Error(`Status code ${response.status}`);
    }
    //} catch (e) {
    //    console.log(e);
    //}
    return null;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public async callService(domain: string, service: string, params: { [key: string]: any }): Promise<void> {
    const userparams = params;
    try {
      await this.post(`services/${domain}/${service}`, (params = userparams));
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Error",
        message: getErrorMessage(error),
      });
    }
  }

  async openCover(entityID: string): Promise<void> {
    return await this.callService("cover", "open_cover", { entity_id: entityID });
  }

  async closeCover(entityID: string): Promise<void> {
    return await this.callService("cover", "close_cover", { entity_id: entityID });
  }

  async toggleCover(entityID: string): Promise<void> {
    return await this.callService("cover", "toggle", { entity_id: entityID });
  }

  async stopCover(entityID: string): Promise<void> {
    return await this.callService("cover", "stop_cover", { entity_id: entityID });
  }

  async toggleFan(entityID: string): Promise<void> {
    return await this.callService("fan", "toggle", { entity_id: entityID });
  }

  async turnOnFan(entityID: string): Promise<void> {
    return await this.callService("fan", "turn_on", { entity_id: entityID });
  }

  async turnOffFan(entityID: string): Promise<void> {
    return await this.callService("fan", "turn_off", { entity_id: entityID });
  }

  async toggleLight(entityID: string): Promise<void> {
    return await this.callService("light", "toggle", { entity_id: entityID });
  }

  async turnOnLight(entityID: string): Promise<void> {
    return await this.callService("light", "turn_on", { entity_id: entityID });
  }

  async turnOffLight(entityID: string): Promise<void> {
    return await this.callService("light", "turn_off", { entity_id: entityID });
  }

  async playMedia(entityID: string): Promise<void> {
    return await this.callService("media_player", "play_media", { entity_id: entityID });
  }

  async playPauseMedia(entityID: string): Promise<void> {
    return await this.callService("media_player", "media_play_pause", { entity_id: entityID });
  }

  async nextMedia(entityID: string): Promise<void> {
    return await this.callService("media_player", "media_next_track", { entity_id: entityID });
  }

  async previousMedia(entityID: string): Promise<void> {
    return await this.callService("media_player", "media_previous_track", { entity_id: entityID });
  }

  async pauseMedia(entityID: string): Promise<void> {
    return await this.callService("media_player", "media_pause", { entity_id: entityID });
  }

  async stopMedia(entityID: string): Promise<void> {
    return await this.callService("media_player", "media_stop", { entity_id: entityID });
  }

  async volumeUpMedia(entityID: string): Promise<void> {
    return await this.callService("media_player", "volume_up", { entity_id: entityID });
  }

  async volumeDownMedia(entityID: string): Promise<void> {
    return await this.callService("media_player", "volume_down", { entity_id: entityID });
  }

  async muteMedia(entityID: string): Promise<void> {
    return await this.callService("media_player", "volume_mute", { entity_id: entityID });
  }

  async setVolumeLevelMedia(entityID: string, volumeLevel: number): Promise<void> {
    return await this.callService("media_player", "volume_set", { entity_id: entityID, volume_level: volumeLevel });
  }

  async selectSourceMedia(entityID: string, source: string): Promise<void> {
    return await this.callService("media_player", "select_source", { entity_id: entityID, source: source });
  }

  async setClimateTemperature(entityID: string, value: number): Promise<void> {
    return await this.callService("climate", "set_temperature", { entity_id: entityID, temperature: value });
  }

  async setClimateOperation(entityID: string, value: string): Promise<void> {
    return await this.callService("climate", "set_hvac_mode", { entity_id: entityID, hvac_mode: value });
  }

  async setClimatePreset(entityID: string, value: string): Promise<void> {
    let v: string | null = value;
    if (value === "None") {
      v = null;
    }
    return await this.callService("climate", "set_preset_mode", { entity_id: entityID, preset_mode: v });
  }

  async toggleSwitch(entityID: string): Promise<void> {
    return await this.callService("switch", "toggle", { entity_id: entityID });
  }

  async turnOnSwitch(entityID: string): Promise<void> {
    return await this.callService("switch", "turn_on", { entity_id: entityID });
  }

  async turnOffSwitch(entityID: string): Promise<void> {
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
            (e.attributes.friendly_name.toLowerCase() || "").includes(params.query.toLowerCase())
        );
      }
      return result;
    }
    return items;
  }

  async downloadFile(url: string, params: { localFilepath: string }): Promise<string> {
    const fullUrl = urljoin(this.url, "api", url);
    console.log(`download ${url}`);
    const response = await fetch(fullUrl, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.token}`,
      },
    });
    if (!response.ok) {
      throw new Error(`unexpected response ${response.statusText}`);
    }
    console.log(`write ${url} to ${params.localFilepath}`);
    await streamPipeline(response.body, fs.createWriteStream(params.localFilepath));
    return params.localFilepath;
  }

  async getCameraProxyURL(entityID: string, localFilepath: string): Promise<void> {
    await this.downloadFile(`camera_proxy/${entityID}`, { localFilepath: localFilepath });
  }
}
