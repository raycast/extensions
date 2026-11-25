import { LocalStorage } from "@raycast/api";

interface Profile {
  uuid: string;
  name: string;
  name_history: NameHistoryEntry[];
  textures: Textures;
}

interface ProfileItem {
  uuid: string;
  name: string;
  name_history: NameHistoryEntryItem[];
  textures: TexturesItem;
}

interface NameHistoryEntry {
  name: string;
  changedAt: Date | string | null;
  accurate: boolean | null;
  lastSeenAt: Date | null;
}

interface NameHistoryEntryItem {
  name: string;
  changed_at: string;
  accurate: boolean | null;
  last_seen_at: string;
}

interface Textures {
  skins: Texture[];
  capes: Texture[] | null;
  cloaks: Texture[] | null;
}

interface TexturesItem {
  SKIN: TextureItem[];
  CAPE?: TextureItem[] | null;
  CLOAK?: TextureItem[] | null;
  BANDANA?: TextureItem[] | null;
}

interface Texture {
  type: string;
  imageHash: string;
  fileHash: string;
  firstSeenAt: Date;
  lastSeenAt: Date;
  slimSkin: boolean | null;
}

interface TextureItem {
  type: string;
  image_hash: string;
  file_hash: string;
  first_seen_at: string;
  last_seen_at: string;
  slim_skin: boolean | null;
}

interface SearchResult {
  results: SearchResultEntry[];
}

interface SearchResultItem {
  results: SearchResultEntryItem[];
}

interface SearchResultEntry {
  uuid: string;
  userName: string;
}

interface SearchResultEntryItem {
  uuid: string;
  name: string;
}

interface Views {
  views: number;
}

interface SocialMediaEntry {
  name: string;
  service: string;
  serviceName: string;
  url: string;
}

interface SocialMediaEntryItem {
  name: string;
  service: string;
  service_name: string;
  url: string;
}

interface Badge {
  name: string;
  description: string;
  receivedAt: Date;
  uuid: string;
}

interface BadgeItem {
  name: string;
  description: string;
  received_at: string;
  uuid: string;
}

interface TextureSearchTexture {
  name: string;
  imageHash: string;
  tags: string;
  useCount: number;
}

interface TextureSearchTextureItem {
  name: string;
  image_hash: string;
  tags: string;
  use_count: number;
}

interface TextureSearchResult {
  textures: TextureSearchTexture[];
}

interface TextureSearchResultItem {
  results: TextureSearchTextureItem[];
}

class Service {
  private async get<T>(path: string, params?: Record<string, string>, signal?: AbortSignal): Promise<T> {
    const query = params ? new URLSearchParams(params).toString() : "";
    const response = await fetch(`https://laby.net/api/${path}${query ? `?${query}` : ""}`, {
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "Raycast Extension",
      },
      signal,
    });

    if (!response.ok) {
      throw new Error(`Request failed with status ${response.status}: ${response.statusText}`);
    }

    return (await response.json()) as T;
  }

  async getLatestSearches(): Promise<SearchResultEntry[]> {
    const searches = await LocalStorage.getItem<string>("searches");

    if (searches) {
      return JSON.parse(searches);
    }

    return [];
  }

  async addSearch(search: SearchResultEntry): Promise<void> {
    let searches = await this.getLatestSearches();
    searches = searches.filter((entry) => entry.uuid !== search.uuid);

    if (searches.length >= 15) {
      searches.pop();
    }

    searches.unshift(search);

    await LocalStorage.setItem("searches", JSON.stringify(searches));

    return;
  }

  async removeSearch(uuid: string): Promise<void> {
    let searches = await this.getLatestSearches();
    searches = searches.filter((entry) => entry.uuid !== uuid);

    await LocalStorage.setItem("searches", JSON.stringify(searches));

    return;
  }

  async getProfile(uuid: string, signal?: AbortSignal): Promise<Profile> {
    const response = await this.get<ProfileItem>("v3/user/" + uuid + "/profile", undefined, signal);
    return {
      uuid: response.uuid,
      name: response.name,
      name_history: response.name_history.map((entry) => {
        let changedAt: Date | string | null = null;
        if (entry.changed_at !== null) {
          if (entry.changed_at.length === 4) {
            changedAt = entry.changed_at;
          } else {
            changedAt = new Date(entry.changed_at);
          }
        }
        return {
          name: entry.name,
          changedAt: changedAt,
          accurate: entry.accurate,
          lastSeenAt: new Date(entry.last_seen_at),
        };
      }),
      textures: {
        skins: response.textures.SKIN.map((texture) => {
          return {
            type: texture.type,
            imageHash: texture.image_hash,
            fileHash: texture.file_hash,
            firstSeenAt: new Date(texture.first_seen_at),
            lastSeenAt: new Date(texture.last_seen_at),
            slimSkin: texture.slim_skin,
          };
        }),
        capes:
          response.textures.CAPE?.map((texture) => {
            return {
              type: texture.type,
              imageHash: texture.image_hash,
              fileHash: texture.file_hash,
              firstSeenAt: new Date(texture.first_seen_at),
              lastSeenAt: new Date(texture.last_seen_at),
              slimSkin: texture.slim_skin,
            };
          }) ?? null,
        cloaks:
          response.textures.CLOAK?.map((texture) => {
            return {
              type: texture.type,
              imageHash: texture.image_hash,
              fileHash: texture.file_hash,
              firstSeenAt: new Date(texture.first_seen_at),
              lastSeenAt: new Date(texture.last_seen_at),
              slimSkin: texture.slim_skin,
            };
          }) ?? null,
      },
    };
  }

  async search(query: string, signal?: AbortSignal): Promise<SearchResult> {
    const response = await this.get<SearchResultItem>(
      `v3/search/names/${encodeURIComponent(query)}`,
      undefined,
      signal,
    );
    const result: SearchResultEntry[] = response.results.map((entry) => {
      return {
        uuid: entry.uuid,
        userName: entry.name,
      };
    });

    return {
      results: result,
    };
  }

  async getViews(uuid: string, signal?: AbortSignal): Promise<Views> {
    const response = await this.get<Views>("v3/user/" + uuid + "/views", undefined, signal);
    return {
      views: response.views,
    };
  }

  async getSocialMedia(uuid: string, signal?: AbortSignal): Promise<SocialMediaEntry[]> {
    const response = await this.get<SocialMediaEntryItem[]>("v3/user/" + uuid + "/socials", undefined, signal);
    return response.map((entry) => {
      return {
        name: entry.name,
        service: entry.service,
        serviceName: entry.service_name,
        url: entry.url,
      };
    });
  }

  async getBadges(uuid: string, signal?: AbortSignal): Promise<Badge[]> {
    const response = await this.get<BadgeItem[]>("v3/user/" + uuid + "/badges", undefined, signal);
    return response.map((entry) => {
      return {
        name: entry.name,
        description: entry.description,
        receivedAt: new Date(entry.received_at),
        uuid: entry.uuid,
      };
    });
  }

  async searchTextures(type: string, input: string, signal?: AbortSignal): Promise<TextureSearchResult> {
    const params: Record<string, string> = {
      order: "most_used",
    };

    if (input !== "") {
      params["input"] = input;
    }

    const response = await this.get<TextureSearchResultItem>(
      `v3/search/textures/${type.toLowerCase()}`,
      params,
      signal,
    );
    return {
      textures: response.results.map((texture) => {
        return {
          name: texture.name,
          imageHash: texture.image_hash,
          tags: texture.tags,
          useCount: texture.use_count,
        };
      }),
    };
  }
}

export default Service;
export type {
  Profile,
  NameHistoryEntry,
  Textures,
  Texture,
  SearchResultEntry,
  SearchResult,
  Views,
  SocialMediaEntry,
  Badge,
  TextureSearchResult,
  TextureSearchTexture,
};
