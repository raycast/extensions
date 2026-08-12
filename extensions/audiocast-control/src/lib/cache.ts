import { createHash } from "node:crypto";
import { Cache as RaycastCache } from "@raycast/api";

enum CacheKey {
  DeviceUrl = "DEVICE_URL",
  DeviceName = "DEVICE_NAME",
  DeviceCert = "DEVICE_CERT",
  DeviceServername = "DEVICE_SERVERNAME",
  DeviceUpnpPort = "DEVICE_UPNP_PORT",
  Recording = "RECORDING",
  LastPlayedRadioUrl = "LAST_RADIO_URL",
}

class Cache {
  _cache: RaycastCache;

  constructor() {
    this._cache = new RaycastCache();
  }

  get deviceUrl(): string | undefined {
    return this._cache.get(CacheKey.DeviceUrl);
  }

  set deviceUrl(url: string) {
    this._cache.set(CacheKey.DeviceUrl, url);
  }

  get deviceName(): string | undefined {
    return this._cache.get(CacheKey.DeviceName);
  }

  set deviceName(name: string) {
    this._cache.set(CacheKey.DeviceName, name);
  }

  get deviceCert(): string | undefined {
    return this._cache.get(CacheKey.DeviceCert);
  }

  set deviceCert(pem: string) {
    this._cache.set(CacheKey.DeviceCert, pem);
  }

  get deviceServername(): string | undefined {
    return this._cache.get(CacheKey.DeviceServername);
  }

  set deviceServername(servername: string) {
    this._cache.set(CacheKey.DeviceServername, servername);
  }

  get deviceUpnpPort(): number | undefined {
    const val = this._cache.get(CacheKey.DeviceUpnpPort);

    return val ? parseInt(val, 10) : undefined;
  }

  set deviceUpnpPort(port: number) {
    this._cache.set(CacheKey.DeviceUpnpPort, String(port));
  }

  get lastPlayedRadioUrl(): string | undefined {
    return this._cache.get(CacheKey.LastPlayedRadioUrl);
  }

  set lastPlayedRadioUrl(url: string) {
    this._cache.set(CacheKey.LastPlayedRadioUrl, url);
  }

  getRecording(title: string, artist: string, album?: string): RecordingSummary | undefined {
    const recordingHash = this.getRecordingHash(title, artist, album);
    const recording = this._cache.get(`${CacheKey.Recording}:${recordingHash}`);

    return recording ? JSON.parse(recording) : undefined;
  }

  saveRecording(recording: RecordingSummary, title: string, artist: string, album?: string): void {
    const recordingHash = this.getRecordingHash(title, artist, album);

    this._cache.set(`${CacheKey.Recording}:${recordingHash}`, JSON.stringify(recording));
  }

  private getRecordingHash(title: string, artist: string, album?: string): string {
    const recordingHash = createHash("sha256")
      .update(`${title}:${artist}${album ? `:${album}` : ""}`, "utf8")
      .digest("hex");

    return recordingHash;
  }
}

export const cache = new Cache();
