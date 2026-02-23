export type PlaybackMode = "play" | "add" | "insert";

export interface SearchItem {
  /** item_id for browsing (from actions.go). Empty if not browseable. */
  goId: string;
  /** item_id for playing (from params when no actions.go). Empty if browseable. */
  playId: string;
  /** Full display name (title + artist joined with " · ") */
  name: string;
  /** Primary title, cleaned of quality tags */
  title: string;
  /** Artist name */
  artist: string;
  /** Album name (only present for tracks) */
  album: string;
  /** Quality indicator extracted from title (e.g. "Hi-Res") */
  quality: string;
  /** Item type from the API (e.g. "playlist", "audio") */
  type: string;
  /** Raw icon path from the API (e.g. "/imageproxy/..."). Empty if none. */
  icon: string;
}

const QUALITY_RE = /\s*\((?:Hi-Res|(?:\d+-Bit\/\d+kHz))[^)]*\)/i;

export class LyrionClient {
  private url: string;
  private baseUrl: string;
  private playerId: string;
  private qobuzGoId: string | null = null;
  private cache = new Map<string, { data: unknown[]; ts: number }>();
  private static CACHE_TTL = 5 * 60 * 1000;

  constructor(host: string, port: number | string = 9000, playerId: string) {
    this.baseUrl = `http://${host}:${port}`;
    this.url = `${this.baseUrl}/jsonrpc.js`;
    this.playerId = playerId;
  }

  private getCached(key: string): unknown[] | null {
    const entry = this.cache.get(key);
    if (entry && Date.now() - entry.ts < LyrionClient.CACHE_TTL)
      return entry.data;
    if (entry) this.cache.delete(key);
    return null;
  }

  /**
   * Build a full artwork URL from an icon path.
   * Optionally resize via the LMS imageproxy by appending a size suffix.
   */
  getArtworkUrl(iconPath: string, size?: number): string {
    if (!iconPath) return "";
    if (iconPath.startsWith("http")) return iconPath;

    let path = iconPath;
    if (size && path.includes("/imageproxy/")) {
      path = path.replace(/\/image[^/]*$/, `/image_${size}x${size}_o`);
    }

    return `${this.baseUrl}${path.startsWith("/") ? "" : "/"}${path}`;
  }

  private async request(method: string, params: unknown[]) {
    const response = await fetch(this.url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: 1, method, params }),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return (await response.json()).result;
  }

  private async globalsearchItems(
    query: string,
    itemId: string | null,
    limit: number,
  ) {
    const cacheKey = `gs:${query}:${itemId ?? ""}:${limit}`;
    const cached = this.getCached(cacheKey);
    if (cached) return cached;

    const params: (string | number)[] = [
      "globalsearch",
      "items",
      0,
      limit,
      `search:${query}`,
      "menu:jive",
    ];
    if (itemId) params.push(`item_id:${itemId}`);
    const result = await this.request("slim.request", [this.playerId, params]);
    const data = result?.item_loop ?? result?.loop_loop ?? [];
    this.cache.set(cacheKey, { data, ts: Date.now() });
    return data;
  }

  /**
   * Parse raw Jive menu item, extracting structured metadata.
   *
   * Album text format: "Album Title (Hi-Res)\nArtist"
   * Track text format: "Track Title (Hi-Res)\nArtist - Album Title"
   */
  private static parseItem(raw: Record<string, unknown>): SearchItem {
    const actions = raw.actions as
      | { go?: { params?: { item_id?: string } } }
      | undefined;
    const params = raw.params as { item_id?: string } | undefined;

    const hasGo = Boolean(actions?.go?.params?.item_id);
    const goId = hasGo ? actions!.go!.params!.item_id! : "";
    const playId = hasGo ? "" : (params?.item_id ?? "");

    const text = raw.text as string | undefined;
    const lines =
      typeof text === "string"
        ? text.split("\n")
        : [(raw.name as string) ?? ""];

    const rawTitle = lines[0] ?? "";
    const qualityMatch = rawTitle.match(QUALITY_RE);
    const quality = qualityMatch
      ? qualityMatch[0].replace(/^\s*\(|\)$/g, "")
      : "";
    const title = rawTitle.replace(QUALITY_RE, "").trim();

    const secondLine = lines.slice(1).join(" \u00b7 ");
    let artist = secondLine;
    let album = "";

    const dashIdx = secondLine.indexOf(" - ");
    if (dashIdx !== -1) {
      artist = secondLine.substring(0, dashIdx);
      album = secondLine
        .substring(dashIdx + 3)
        .replace(QUALITY_RE, "")
        .trim();
    }

    const name = lines.join(" \u00b7 ");
    const itemType = (raw.type as string) ?? "";
    const icon = (raw.icon as string) ?? (raw["icon-id"] as string) ?? "";

    return {
      goId,
      playId,
      name,
      title,
      artist,
      album,
      quality,
      type: itemType,
      icon,
    };
  }

  async searchGlobal(query: string, limit = 10): Promise<SearchItem[]> {
    const raw = await this.globalsearchItems(query, null, limit);
    return (raw as Record<string, unknown>[])
      .map(LyrionClient.parseItem)
      .filter((i) => i.goId || i.playId);
  }

  async getSubmenu(
    query: string,
    goId: string,
    limit = 20,
  ): Promise<SearchItem[]> {
    const raw = await this.globalsearchItems(query, goId, limit);
    return (raw as Record<string, unknown>[])
      .map(LyrionClient.parseItem)
      .filter((i) => i.goId || i.playId);
  }

  /**
   * Play, add, or insert an item into the playlist.
   * - "play": replace playlist and start playback
   * - "add": append to end of playlist
   * - "insert": insert as next track(s)
   */
  async play(
    playId: string,
    query: string,
    mode: PlaybackMode = "play",
  ): Promise<{ success: boolean; error?: string }> {
    try {
      await this.request("slim.request", [
        this.playerId,
        [
          "globalsearch",
          "playlist",
          mode,
          `item_id:${playId}`,
          `search:${query}`,
        ],
      ]);
      if (mode === "play") {
        await this.request("slim.request", [this.playerId, ["play"]]);
      }
      return { success: true };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }

  async searchQobuz(query: string, limit = 5): Promise<SearchItem[]> {
    if (!this.qobuzGoId) {
      const providers = await this.searchGlobal(query, 20);
      const qobuz = providers.find((p) =>
        p.name.toLowerCase().includes("qobuz"),
      );
      if (!qobuz) return [];
      this.qobuzGoId = qobuz.goId;
    }
    return this.getSubmenu(query, this.qobuzGoId, limit);
  }
}
