import * as https from "node:https";
import {
  type WiiMDevice,
  type PlayerStatus,
  type SystemInfo,
  type InputSource,
  DeviceType,
  DeviceChannel,
  DeviceMode,
  LoopMode,
  mapConstType,
  MetaInfo,
} from "./types";
import { WiiMAPIError } from "./errors";

const API_TIMEOUT_MS = 5000;

export class WiiMAPI {
  private readonly agent: https.Agent;

  constructor(private readonly device: WiiMDevice) {
    this.agent = new https.Agent({ rejectUnauthorized: false });
  }

  private url(command: string): string {
    return `https://${this.device.ip}:${this.device.port}/httpapi.asp?command=${encodeURIComponent(command)}`;
  }

  private request(command: string): Promise<string> {
    return new Promise((resolve, reject) => {
      let settled = false;

      const req = https
        .get(this.url(command), { agent: this.agent }, (res) => {
          let body = "";
          res.on("data", (chunk: string) => {
            body += chunk;
          });
          res.on("end", () => {
            if (settled) return;
            settled = true;
            clearTimeout(timer);
            if (res.statusCode === 200) {
              resolve(body.trim());
            } else {
              reject(new WiiMAPIError("COMMAND_FAILED", `HTTP ${res.statusCode}`, res.statusCode));
            }
          });
        })
        .on("error", (err) => {
          if (settled) return;
          settled = true;
          clearTimeout(timer);
          reject(new WiiMAPIError("NETWORK_TIMEOUT", `Network error: ${err.message}`, undefined, err));
        });

      const timer = setTimeout(() => {
        if (settled) return;
        settled = true;
        req.destroy();
        reject(new WiiMAPIError("NETWORK_TIMEOUT", `Device did not respond within ${API_TIMEOUT_MS}ms`));
      }, API_TIMEOUT_MS);
    });
  }

  private async command(cmd: string): Promise<void> {
    const response = await this.request(cmd);
    if (response !== "OK") {
      throw new WiiMAPIError("COMMAND_FAILED", `Command "${cmd}" returned: ${response}`);
    }
  }

  // --- Playback ---
  async togglePlayPause(): Promise<void> {
    await this.command("setPlayerCmd:onepause");
  }
  async next(): Promise<void> {
    await this.command("setPlayerCmd:next");
  }
  async previous(): Promise<void> {
    await this.command("setPlayerCmd:prev");
  }

  // --- Volume ---
  async getVolume(): Promise<number> {
    // Volume is embedded in getPlayerStatus response as the "vol" field
    const raw = await this.request("getPlayerStatus");
    try {
      const json = JSON.parse(raw);
      const n = Number.parseInt(json.vol, 10);
      if (Number.isNaN(n)) throw new Error("vol field missing or non-numeric");
      return n;
    } catch {
      throw new WiiMAPIError("INVALID_RESPONSE", `Cannot parse volume from: ${raw}`);
    }
  }

  async setVolume(volume: number): Promise<void> {
    const clamped = Math.max(0, Math.min(100, volume));
    await this.command(`setPlayerCmd:vol:${clamped}`);
  }

  async volumeUp(step: number): Promise<void> {
    const current = await this.getVolume();
    await this.setVolume(current + Math.max(1, step));
  }

  async volumeDown(step: number): Promise<void> {
    const current = await this.getVolume();
    await this.setVolume(current - Math.max(1, step));
  }

  async setMute(muted: boolean): Promise<void> {
    await this.command(`setPlayerCmd:mute:${muted ? "1" : "0"}`);
  }

  async toggleMute(): Promise<boolean> {
    const deviceStatus = await this.getPlayerStatus();
    await this.setMute(!deviceStatus.mute);
    return !deviceStatus.mute;
  }

  // --- Metadata ---
  async getMetaInfo(): Promise<MetaInfo> {
    const raw = await this.request("getMetaInfo");
    try {
      const json = JSON.parse(raw);
      return {
        album: defaultIfUnknown(json.metaData.album),
        title: defaultIfUnknown(json.metaData.title),
        subtitle: defaultIfUnknown(json.metaData.subtitle),
        artist: defaultIfUnknown(json.metaData.artist),
        albumArtURI: defaultIfUnknown(json.metaData.albumArtURI),
        sampleRate: Number(defaultIfUnknown(json.metaData.sampleRate, "0")),
        bitDepth: Number(defaultIfUnknown(json.metaData.bitDepth, "0")),
        bitRate: Number(defaultIfUnknown(json.metaData.bitRate, "0")),
        trackId: json.metaData.trackId ?? "",
      };
    } catch {
      throw new WiiMAPIError("INVALID_RESPONSE", `Cannot parse metadata info: ${raw}`);
    }
  }

  // --- Preset (1-based: MCUKeyShortClick:1 = first preset) ---
  async selectPreset(index: number): Promise<void> {
    const clamped = Math.max(0, Math.min(11, index));
    await this.command(`MCUKeyShortClick:${clamped + 1}`);
  }

  // --- Input ---
  async switchInput(input: InputSource): Promise<void> {
    const map: Record<InputSource, string> = {
      "line-in": "line-in",
      bluetooth: "bluetooth",
      optical: "optical",
      usb: "usb",
      wifi: "wifi",
    };
    await this.command(`setPlayerCmd:switchmode:${map[input]}`);
  }

  // --- EQ ---
  async getEQPresets(): Promise<string[]> {
    const raw = await this.request("EQGetList");
    try {
      return JSON.parse(raw) as string[];
    } catch {
      throw new WiiMAPIError("INVALID_RESPONSE", `Cannot parse EQ preset list: ${raw}`);
    }
  }

  async setEQPreset(name: string): Promise<void> {
    // EQLoad accepts the preset name and returns JSON {status:"OK"}
    const raw = await this.request(`EQLoad:${name}`);
    try {
      const json = JSON.parse(raw);
      if (json.status !== "OK") {
        throw new WiiMAPIError("COMMAND_FAILED", `EQLoad:${name} failed: ${raw}`);
      }
    } catch (e) {
      if (e instanceof WiiMAPIError) throw e;
      throw new WiiMAPIError("INVALID_RESPONSE", `Unexpected EQLoad response: ${raw}`);
    }
  }

  async setEQEnabled(enabled: boolean): Promise<void> {
    // EQOn/EQOff return JSON {status:"OK"} not plain "OK"
    const raw = await this.request(enabled ? "EQOn" : "EQOff");
    try {
      const json = JSON.parse(raw);
      if (json.status !== "OK") {
        throw new WiiMAPIError("COMMAND_FAILED", `EQ toggle failed: ${raw}`);
      }
    } catch (e) {
      if (e instanceof WiiMAPIError) throw e;
      throw new WiiMAPIError("INVALID_RESPONSE", `Unexpected EQ toggle response: ${raw}`);
    }
  }

  // FIXME: this currently failes with {status: "failed"} despite being documented
  /*
  async getEQStatus(): Promise<boolean> {
    const raw = await this.request("EQGetStat");
    try {
      const json = JSON.parse(raw);
      console.log("Raw EQ status response:", json);
      if (json.status !== "OK") {
        throw new WiiMAPIError("COMMAND_FAILED", `EQ status check failed: ${raw}`);
      }
      return json.EQStat === "On";
    } catch {
      throw new WiiMAPIError("INVALID_RESPONSE", `Cannot parse EQ status from: ${raw}`);
    }
  }

  async toggleEQ(): Promise<boolean> {
    const eqStatus = await this.getEQStatus();
    await this.setEQEnabled(!eqStatus);
    return !eqStatus;
  }
  */

  // --- Device info ---
  async getSystemInfo(): Promise<SystemInfo> {
    const raw = await this.request("getStatusEx");
    try {
      const json = JSON.parse(raw);
      return {
        ssid: json.ssid ?? "",
        firmware: json.firmware ?? "",
        macAddress: json.MAC ?? "",
        internet: json.internet === "1",
        uuid: json.uuid ?? "",
        groupName: json.GroupName ?? "",
        deviceName: json.DeviceName ?? "",
      };
    } catch {
      throw new WiiMAPIError("INVALID_RESPONSE", `Cannot parse system info: ${raw}`);
    }
  }

  async getPlayerStatus(): Promise<PlayerStatus> {
    const raw = await this.request("getPlayerStatus");
    try {
      const json = JSON.parse(raw);
      console.log("Raw player status response:", json);
      return {
        type: mapConstType(DeviceType, json.type, "MASTER"),
        ch: mapConstType(DeviceChannel, json.ch, "STEREO"),
        mode: mapConstType(DeviceMode, json.mode, "NONE"),
        loop: mapConstType(LoopMode, json.loop, "ALL"),
        eq: Number(json.eq ?? 0),
        status: json.status ?? "stop",
        currentPosition: Number(json.curpos ?? 0),
        offsetPosition: Number(json.offset_pts ?? 0),
        totalLength: Number(json.totlen ?? 0),
        alarm: json.alarmflag === "1",
        playlistLength: Number(json.plicount ?? 0),
        playlistIndex: Number(json.plicurr ?? 0),
        mute: json.mute === "1",
        vol: Number(json.vol ?? 0),
      };
    } catch {
      throw new WiiMAPIError("INVALID_RESPONSE", `Cannot parse player status: ${raw}`);
    }
  }
}

function defaultIfUnknown(value: string, fallback = ""): string {
  return value.toLowerCase() === "unknow" ? fallback : value;
}
