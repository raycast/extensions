import { getDiscorBasedRequestHeaders } from "discord-token-decrypt";
import { getDiscordToken } from "discord-token-decrypt";
import fetch, { type RequestInit } from "node-fetch";
import { LocalStorage } from "@raycast/api";

class Discord {
  #baseUrl = "https://discord.com/api/v9";
  #token: string | null = null;
  #tokenPromise: Promise<string> | null = null;

  #tokenCacheDuration = 7 * 24 * 60 * 60 * 1000; // 1 week

  async #getToken(): Promise<string> {
    if (this.#tokenPromise) {
      return this.#tokenPromise;
    }

    this.#tokenPromise = this.#fetchTokenWithCache();

    try {
      const token = await this.#tokenPromise;
      this.#token = token;
      return token;
    } finally {
      this.#tokenPromise = null;
    }
  }

  async #fetchTokenWithCache(): Promise<string> {
    if (this.#token) {
      return this.#token;
    }

    const cachedToken = await LocalStorage.getItem<string>("discord-token-cache");
    if (cachedToken) {
      const parsedCache = JSON.parse(cachedToken) as { token: string; expiresAt: number };
      if (parsedCache.expiresAt > Date.now()) {
        return parsedCache.token;
      }
    }

    const token = await getDiscordToken();
    if (!token) {
      throw new Error("Failed to get Discord token");
    }

    const tokenCache = {
      token,
      expiresAt: Date.now() + this.#tokenCacheDuration,
    };

    await LocalStorage.setItem("discord-token-cache", JSON.stringify(tokenCache));
    return token;
  }

  async #buildHeaders() {
    const token = await this.#getToken();
    const baseHeaders = getDiscorBasedRequestHeaders();
    return {
      ...baseHeaders,
      Authorization: token,
    };
  }

  async invalidateToken(): Promise<void> {
    this.#token = null;
    await LocalStorage.removeItem("discord-token-cache");
  }

  async #apiRequest<T>(path: string, options: RequestInit = {}, isRetry = false): Promise<T> {
    const headers = await this.#buildHeaders();
    const requestOptions = {
      ...options,
      headers: {
        ...headers,
        ...(options.headers || {}),
      },
    };

    const response = await fetch(this.#baseUrl + path, requestOptions);

    if (response.status === 401 && !isRetry) {
      console.log("Unauthorized error detected, refreshing token and retrying...");

      await this.invalidateToken();
      return this.#apiRequest<T>(path, options, true);
    }

    let data: unknown;
    if (response.headers.get("content-type")?.includes("application/json")) {
      data = await response.json();
    } else {
      data = await response.text();
    }

    if (response.status === 429) {
      const retryAfter = (<{ retry_after: number } | undefined>data)?.retry_after || 1;
      await new Promise((resolve) => setTimeout(resolve, retryAfter * 1000));
      return this.#apiRequest<T>(path, options);
    }

    if (!response.ok) {
      const errorMessage =
        typeof data === "object" && data !== null && "message" in data ? String(data.message) : "Discord API error";
      throw new Error(errorMessage, {
        cause: data,
      });
    }
    return data as T;
  }

  async getGuilds(): Promise<DiscordGuild[]> {
    const url = `/users/@me/guilds`;
    return this.#apiRequest<DiscordGuild[]>(url);
  }

  async getDefaultSoundboardItems(): Promise<SoundboardItem[]> {
    const result = await this.#apiRequest<SoundItemResult[]>("/soundboard-default-sounds");
    return result.map((item) => ({
      id: item.sound_id,
      name: item.name,
      emojiName: item.emoji_name,
      emojiId: item.emoji_id,
      available: item.available,
    }));
  }

  async getSoundboardItems(guildId: string): Promise<SoundboardItem[]> {
    const url = `/guilds/${guildId}/soundboard-sounds`;

    type SoundItemResultWithGuildId = SoundItemResult & {
      guild_id: string;
    };

    const result = await this.#apiRequest<{
      items: SoundItemResultWithGuildId[];
    }>(url);

    return result.items.map((item) => ({
      id: item.sound_id,
      name: item.name,
      emojiName: item.emoji_name,
      emojiId: item.emoji_id,
      guildId: item.guild_id,
      available: item.available,
    }));
  }

  async sendSoundboardSound(sound: SoundboardItem, channelId: string): Promise<void> {
    const url = `/channels/${channelId}/send-soundboard-sound`;
    const body = {
      sound_id: sound.id,
      emoji_id: sound.emojiId,
      emoji_name: sound.emojiName,
      source_guild_id: sound.guildId,
    };
    await this.#apiRequest(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
  }
}

export default new Discord();

export type DiscordGuild = {
  id: string;
  name: string;
  icon?: string;
  banner?: string;
  owner: boolean;
  permissions: string;
  features: string[];
};

export type SoundboardItem = {
  id: string;
  name: string;
  emojiName: string | null;
  emojiId: string | null;
  guildId?: string;
  available: boolean;
};

type SoundItemResult = {
  name: string;
  sound_id: string;
  emoji_name: string | null;
  emoji_id: string | null;
  available: boolean;
};
