import { showToast, ToastStyle } from "@raycast/api";
import fetch from "node-fetch";
import urljoin from "url-join";
import { getErrorMessage } from "./utils";

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

export class HomeAssistant {
  public token: string;
  public url: string;
  constructor(url: string, token: string) {
    this.token = token;
    this.url = url;
  }

  public urlJoin(text: string): string {
    return urljoin(this.url, text);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public async fetch(url: string, params: { [key: string]: string } = {}): Promise<any> {
    const ps = paramString(params);
    const fullUrl = urljoin(this.url, "api", url + ps);
    console.log(`send GET request: ${fullUrl}`);
    try {
      const response = await fetch(fullUrl, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.token}`,
        },
      });
      const json = await response.json();
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
      showToast(ToastStyle.Failure, "Error", getErrorMessage(error));
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
}
