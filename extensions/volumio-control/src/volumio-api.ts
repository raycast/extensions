import axios, { AxiosInstance } from "axios";
import { getPreferenceValues } from "@raycast/api";

interface Preferences {
  volumioHost: string;
}

export interface PlayerState {
  status: string;
  position: number;
  title?: string;
  artist?: string;
  album?: string;
  albumart?: string;
  duration?: number;
  volume?: number;
  mute?: boolean;
  service?: string;
  random?: boolean;
  repeat?: boolean;
}

export interface BrowseItem {
  service?: string;
  type?: string;
  title?: string;
  name?: string;
  artist?: string;
  album?: string;
  albumart?: string;
  uri: string;
  plugin_type?: string;
  plugin_name?: string;
}

export interface BrowseResponse {
  navigation?: {
    lists?: Array<{
      title: string;
      icon: string;
      type?: string;
      items: BrowseItem[];
    }>;
    list?: BrowseItem[];
  };
}

export interface QueueItem {
  service?: string;
  name?: string;
  title?: string;
  artist?: string;
  album?: string;
  albumart?: string;
  uri: string;
  duration?: number;
}

export interface QueueResponse {
  queue: QueueItem[];
}

export class VolumioAPI {
  private api: AxiosInstance;
  private baseURL: string;

  constructor() {
    const preferences = getPreferenceValues<Preferences>();
    const host = preferences.volumioHost || "volumio.local";
    this.baseURL = `http://${host}`;

    this.api = axios.create({
      baseURL: this.baseURL,
      timeout: 5000,
    });
  }

  async getPlayerState(): Promise<PlayerState> {
    const response = await this.api.get("/api/v1/getState");
    return response.data;
  }

  async play(): Promise<void> {
    await this.api.get("/api/v1/commands/?cmd=play");
  }

  async pause(): Promise<void> {
    await this.api.get("/api/v1/commands/?cmd=pause");
  }

  async toggle(): Promise<void> {
    await this.api.get("/api/v1/commands/?cmd=toggle");
  }

  async next(): Promise<void> {
    await this.api.get("/api/v1/commands/?cmd=next");
  }

  async previous(): Promise<void> {
    await this.api.get("/api/v1/commands/?cmd=prev");
  }

  async stop(): Promise<void> {
    await this.api.get("/api/v1/commands/?cmd=stop");
  }

  async setVolume(volume: number): Promise<void> {
    const clampedVolume = Math.max(0, Math.min(100, volume));
    await this.api.get(`/api/v1/commands/?cmd=volume&volume=${clampedVolume}`);
  }

  async toggleMute(): Promise<void> {
    const state = await this.getPlayerState();
    if (state.mute) {
      await this.api.get("/api/v1/commands/?cmd=unmute");
    } else {
      await this.api.get("/api/v1/commands/?cmd=mute");
    }
  }

  async toggleRandom(): Promise<void> {
    await this.api.get("/api/v1/commands/?cmd=random");
  }

  async toggleRepeat(): Promise<void> {
    await this.api.get("/api/v1/commands/?cmd=repeat");
  }

  async browse(uri?: string): Promise<BrowseResponse | BrowseItem[]> {
    const endpoint = uri ? `/api/v1/browse?uri=${encodeURIComponent(uri)}` : "/api/v1/browse";
    const response = await this.api.get(endpoint);
    return response.data;
  }

  async playPlaylist(uri: string): Promise<void> {
    await this.api.post("/api/v1/replaceAndPlay", { uri });
  }

  async addToQueue(uri: string): Promise<void> {
    await this.api.post("/api/v1/addToQueue", { uri });
  }

  async clearQueue(): Promise<void> {
    await this.api.get("/api/v1/commands/?cmd=clearQueue");
  }

  async getQueue(): Promise<QueueResponse> {
    const response = await this.api.get<QueueResponse>("/api/v1/getQueue");
    return response.data;
  }

  getAlbumArtUrl(path?: string): string {
    if (!path) return "";
    if (path.startsWith("http")) return path;
    return `${this.baseURL}${path.startsWith("/") ? path : "/" + path}`;
  }
}
