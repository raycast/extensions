import os from "node:os";
import { environment, showToast, Toast } from "@raycast/api";
import {
  ApiMeta,
  ArenaOptions,
  Block,
  Channel,
  ChannelStatus,
  Params,
  SearchBlocksResponse,
  SearchChannelsResponse,
  SearchFilters,
  SearchResponse,
  SearchUsersResponse,
  User,
} from "./types";
import { isHttpUrl } from "../utils/url";

interface ApiErrorPayload {
  error?: string;
  code?: number;
  details?: { message?: string };
}

interface ApiEnvelope<T> {
  data?: T;
  meta?: ApiMeta;
}

function unwrapEnvelopeData<T>(value: unknown): T {
  const record = toRecord(value);
  if ("data" in record && record.data !== undefined && record.data !== null) {
    return record.data as T;
  }
  return value as T;
}

/** v3 exposes user channels via `GET /users/{id}/contents?type=Channel` (not `/users/{id}/channels`). */
const USER_CONTENT_SORT = new Set(["created_at_asc", "created_at_desc", "updated_at_asc", "updated_at_desc"]);

function contentSortForUserChannels(sort: string | undefined): string {
  if (sort && USER_CONTENT_SORT.has(sort)) {
    return sort;
  }
  return "updated_at_desc";
}

function ensureArray<T>(value: unknown): T[] {
  if (Array.isArray(value)) {
    return value as T[];
  }
  return [];
}

function toRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object") {
    return {};
  }
  return value as Record<string, unknown>;
}

function markdownToText(value: unknown): string | null {
  const record = toRecord(value);
  return (record.plain as string) ?? (record.markdown as string) ?? null;
}

function pickImageVersionUrl(version: unknown): string {
  const v = toRecord(version);
  for (const key of ["src_2x", "src"] as const) {
    const val = v[key];
    if (isHttpUrl(val)) return val.trim();
  }
  return "";
}

function mapBlockImage(imageRaw: unknown): Block["image"] | null {
  const image = toRecord(imageRaw);
  if (!image || Object.keys(image).length === 0) {
    return null;
  }

  if (image.small || image.medium || image.large || image.square) {
    const thumbUrl =
      pickImageVersionUrl(image.square) || pickImageVersionUrl(image.small) || pickImageVersionUrl(image.medium) || "";
    const displayUrl = pickImageVersionUrl(image.medium) || pickImageVersionUrl(image.large) || thumbUrl;
    const originalUrl =
      (isHttpUrl(image.src) ? image.src.trim() : "") || pickImageVersionUrl(image.large) || displayUrl || thumbUrl;
    if (!thumbUrl && !originalUrl) {
      return null;
    }
    return {
      filename: String(image.filename ?? ""),
      content_type: String(image.content_type ?? ""),
      updated_at: String(image.updated_at ?? ""),
      thumb: thumbUrl ? { url: thumbUrl } : undefined,
      display: displayUrl ? { url: displayUrl } : undefined,
      original: originalUrl
        ? {
            url: originalUrl,
            file_size: Number(image.file_size ?? 0),
            file_size_display: "",
          }
        : undefined,
    };
  }

  const thumb = toRecord(image.thumb);
  const display = toRecord(image.display);
  const original = toRecord(image.original);
  if (thumb.url || display.url || original.url) {
    const mapped = {
      filename: String(image.filename ?? ""),
      content_type: String(image.content_type ?? ""),
      updated_at: String(image.updated_at ?? ""),
      thumb: isHttpUrl(thumb.url) ? { url: thumb.url.trim() } : undefined,
      display: isHttpUrl(display.url) ? { url: display.url.trim() } : undefined,
      original: isHttpUrl(original.url)
        ? {
            url: original.url.trim(),
            file_size: Number(original.file_size ?? 0),
            file_size_display: String(original.file_size_display ?? ""),
          }
        : undefined,
    };
    if (!mapped.thumb && !mapped.display && !mapped.original) return null;
    return mapped;
  }

  return null;
}

function mapUser(raw: unknown): User {
  const record = toRecord(raw);
  const name = (record.name as string) ?? (record.full_name as string) ?? "Unknown";
  const nameParts = name.split(" ");
  return {
    id: Number(record.id ?? 0),
    slug: (record.slug as string) ?? "",
    full_name: name,
    first_name: (record.first_name as string) ?? nameParts[0] ?? "",
    last_name: (record.last_name as string) ?? nameParts.slice(1).join(" "),
    avatar: (record.avatar as string) ?? "",
    initials: (record.initials as string) ?? "",
    channel_count: Number(toRecord(record.counts).channels ?? record.channel_count ?? 0),
    following_count: Number(toRecord(record.counts).following ?? record.following_count ?? 0),
    follower_count: Number(toRecord(record.counts).followers ?? record.follower_count ?? 0),
    username: (record.username as string) ?? name,
  };
}

function mapChannel(raw: unknown): Channel {
  const record = toRecord(raw);
  const owner = toRecord(record.owner);
  const visibility = (record.visibility as ChannelStatus) ?? "public";
  const collaborators = ensureArray<unknown>(record.collaborators).map(mapUser);
  const counts = toRecord(record.counts);
  const can = toRecord(record.can);
  const connection = toRecord(record.connection);

  const descriptionText =
    markdownToText(record.description) ?? (typeof record.description === "string" ? record.description : null);

  return {
    id: Number(record.id ?? 0),
    title: (record.title as string) ?? "Untitled Channel",
    slug: (record.slug as string) ?? "",
    description: descriptionText,
    owner_slug: (owner.slug as string) ?? (record.owner_slug as string) ?? "",
    status: visibility,
    open: visibility === "public",
    published: visibility !== "private",
    length: Number(counts.contents ?? record.length ?? 0),
    created_at: (record.created_at as string) ?? "",
    updated_at: (record.updated_at as string) ?? "",
    user: mapUser(owner.id ? owner : record.user),
    collaborators,
    can: {
      add_to: Boolean(can.add_to),
      update: Boolean(can.update),
      destroy: Boolean(can.destroy),
      manage_collaborators: Boolean(can.manage_collaborators),
    },
    connection: connection.id ? { id: Number(connection.id) } : null,
  };
}

function mapBlock(raw: unknown): Block {
  const root = toRecord(raw);
  const inner = root.data;
  const record =
    inner !== undefined && inner !== null && typeof inner === "object" && !Array.isArray(inner)
      ? toRecord(inner)
      : root;

  const blockType = (record.type as string) ?? (record.class as string) ?? "Text";
  let normalizedClass: Block["class"];
  if (blockType === "Embed") {
    normalizedClass = "Media";
  } else if (blockType === "PendingBlock") {
    normalizedClass = "PendingBlock";
  } else {
    normalizedClass = blockType as Block["class"];
  }

  const source = toRecord(record.source);
  const attachment = toRecord(record.attachment);
  const connection = toRecord(record.connection);
  const embed = toRecord(record.embed);
  const contentRecord = toRecord(record.content);
  const descriptionRecord = toRecord(record.description);
  const title = typeof record.title === "string" ? record.title : null;
  const contentText =
    (typeof contentRecord.markdown === "string" ? contentRecord.markdown : null) ??
    (typeof contentRecord.plain === "string" ? contentRecord.plain : null) ??
    markdownToText(record.content) ??
    (typeof record.content === "string" ? record.content : null);
  const descriptionText =
    markdownToText(record.description) ?? (typeof record.description === "string" ? record.description : null);

  let image = mapBlockImage(record.image);
  if (!image && embed.thumbnail_url) {
    const u = String(embed.thumbnail_url);
    image = {
      filename: "",
      content_type: "",
      updated_at: "",
      thumb: { url: u },
      display: { url: u },
      original: { url: u, file_size: 0, file_size_display: "" },
    };
  }

  const plainTitle =
    (record.generated_title as string) ?? title ?? contentText ?? (source.title as string) ?? "Untitled";

  return {
    id: Number(record.id ?? 0),
    title,
    updated_at: (record.updated_at as string) ?? "",
    created_at: (record.created_at as string) ?? "",
    state: (record.state as string) ?? "available",
    comment_count: Number(record.comment_count ?? 0),
    generated_title: plainTitle,
    class: normalizedClass,
    base_class: (record.base_type as string) ?? (record.base_class as string) ?? "Block",
    content: contentText,
    content_html: (contentRecord.html as string) ?? (record.content_html as string | null) ?? null,
    description: descriptionText,
    description_html: (descriptionRecord.html as string) ?? (record.description_html as string | null) ?? null,
    source: source.url ? { title: source.title as string, url: source.url as string } : null,
    image,
    user: mapUser(record.user),
    visibility: ((record.visibility as Block["visibility"]) ?? "public") as Block["visibility"],
    slug: (record.slug as string) ?? "",
    attachment: attachment.url
      ? {
          file_name: String(attachment.filename ?? attachment.file_name ?? ""),
          file_size: Number(attachment.file_size ?? 0),
          file_size_display: String(attachment.file_size_display ?? ""),
          content_type: String(attachment.content_type ?? ""),
          extension: String(attachment.file_extension ?? attachment.extension ?? ""),
          url: String(attachment.url),
        }
      : undefined,
    connection: connection.id ? { id: Number(connection.id) } : null,
  };
}

function parseMeta(meta: unknown): ApiMeta {
  const value = toRecord(meta);
  return {
    current_page: Number(value.current_page ?? 1),
    per_page: Number(value.per_page ?? 24),
    total_pages: Number(value.total_pages ?? 1),
    total_count: Number(value.total_count ?? 0),
    next_page: value.next_page === null ? null : Number(value.next_page ?? null),
    prev_page: value.prev_page === null ? null : Number(value.prev_page ?? null),
    has_more_pages: Boolean(value.has_more_pages),
  };
}

function messageFromError(status: number, payload: ApiErrorPayload): string {
  const detailsMessage = payload.details?.message;
  if (detailsMessage) {
    return detailsMessage;
  }
  switch (status) {
    case 401:
      return "Authentication required. Sign in again or check your access token.";
    case 403:
      return "Insufficient permissions. Your token may need the 'write' scope.";
    case 429:
      return "Rate limit reached. Please wait a moment before retrying.";
    default:
      return payload.error ?? `Request failed with status ${status}`;
  }
}

export class Arena {
  private baseURL: string;
  private headers: Record<string, string>;

  constructor(config: ArenaOptions = {}) {
    this.baseURL = config.baseURL ?? "https://api.are.na/v3/";
    this.headers = {
      Accept: "application/json",
      "Content-Type": "application/json",
      "User-Agent": `Are.na Extension /Raycast/${environment.raycastVersion} (${os.type()} ${os.release()})`,
    };
    if (config.accessToken) {
      this.headers.Authorization = `Bearer ${config.accessToken}`;
    }
  }

  private async request<T>(method: string, path: string, options?: { query?: Params; body?: Params }): Promise<T> {
    const url = new URL(path, this.baseURL);
    for (const [key, value] of Object.entries(options?.query ?? {})) {
      if (value === undefined || value === null || value === "") {
        continue;
      }
      if (Array.isArray(value)) {
        url.searchParams.set(key, value.join(","));
      } else {
        url.searchParams.set(key, String(value));
      }
    }

    const response = await fetch(url, {
      method,
      headers: this.headers,
      body: options?.body ? JSON.stringify(options.body) : undefined,
    });

    if (!response.ok) {
      let payload: ApiErrorPayload = {};
      try {
        payload = (await response.json()) as ApiErrorPayload;
      } catch {
        payload = {};
      }
      const message = messageFromError(response.status, payload);
      await showToast({
        style: Toast.Style.Failure,
        title: "Are.na API request failed",
        message,
      });
      throw new Error(message);
    }

    if (response.status === 204) {
      return undefined as T;
    }

    return (await response.json()) as T;
  }

  private async getList<T>(path: string, query?: Params): Promise<{ items: T[]; meta: ApiMeta }> {
    const envelope = await this.request<ApiEnvelope<unknown[]>>("GET", path, { query });
    return {
      items: ensureArray<unknown>(envelope.data).map((item) => item as T),
      meta: parseMeta(envelope.meta),
    };
  }

  search(query: string) {
    const queryValue = query?.trim() || "*";
    const buildResponse = async (filters: SearchFilters | undefined, scopeType: string): Promise<SearchResponse> => {
      const { type: subtypeOrScope, ...restFilters } = filters ?? {};
      const searchType =
        scopeType === "Block" && subtypeOrScope && subtypeOrScope !== "Block" ? subtypeOrScope : scopeType;
      const response = await this.getList<unknown>("search", { query: queryValue, ...restFilters, type: searchType });
      const users = response.items.filter((item) => toRecord(item).type === "User").map(mapUser);
      const channels = response.items.filter((item) => toRecord(item).type === "Channel").map(mapChannel);
      const blocks = response.items
        .filter((item) => {
          const itemType = String(toRecord(item).type ?? "");
          return itemType !== "User" && itemType !== "Group" && itemType !== "Channel";
        })
        .map(mapBlock);
      return {
        term: queryValue,
        current_page: response.meta.current_page,
        total_pages: response.meta.total_pages,
        per: response.meta.per_page,
        meta: response.meta,
        users,
        channels,
        blocks,
      };
    };

    return {
      all: async (filters?: SearchFilters): Promise<SearchResponse> => buildResponse(filters, "All"),
      users: async (filters?: SearchFilters): Promise<SearchUsersResponse> => {
        const result = await buildResponse(filters, "User");
        return { ...result, users: result.users };
      },
      channels: async (filters?: SearchFilters): Promise<SearchChannelsResponse> => {
        const result = await buildResponse(filters, "Channel");
        return { ...result, channels: result.channels };
      },
      blocks: async (filters?: SearchFilters): Promise<SearchBlocksResponse> => {
        const result = await buildResponse(filters, "Block");
        return { ...result, blocks: result.blocks };
      },
    };
  }

  me() {
    return this.request<unknown>("GET", "me").then((response) => mapUser(unwrapEnvelopeData(response)));
  }

  user(identifier: string | number) {
    return {
      get: async () =>
        this.request<unknown>("GET", `users/${identifier}`).then((response) => mapUser(unwrapEnvelopeData(response))),
      channels: async (params?: SearchFilters) => {
        const { page, per, sort } = params ?? {};
        const response = await this.getList<unknown>(`users/${identifier}/contents`, {
          page,
          per,
          sort: contentSortForUserChannels(sort),
          type: "Channel",
        });
        return response.items.map(mapChannel);
      },
      followers: async (params?: SearchFilters) => {
        const response = await this.getList<unknown>(`users/${identifier}/followers`, params);
        return response.items.map(mapUser);
      },
      following: async (params?: SearchFilters) => {
        const response = await this.getList<unknown>(`users/${identifier}/following`, params);
        return response.items.map((item) => {
          const record = toRecord(item);
          if (record.type === "User") {
            return mapUser(item);
          }
          return mapUser(record.user);
        });
      },
    };
  }

  channel(identifier?: string | number) {
    const channelIdentifier = identifier ?? "";
    return {
      get: async () =>
        this.request<unknown>("GET", `channels/${channelIdentifier}`).then((response) =>
          mapChannel(unwrapEnvelopeData(response)),
        ),
      connections: async (params?: SearchFilters) => {
        const response = await this.getList<unknown>(`channels/${channelIdentifier}/connections`, params);
        return response.items.map(mapChannel);
      },
      contents: async (params?: SearchFilters) => {
        const response = await this.getList<unknown>(`channels/${channelIdentifier}/contents`, params);
        const items = response.items.map((item) => {
          const itemType = String(toRecord(item).type ?? "");
          if (itemType === "Channel") {
            const channel = mapChannel(item);
            return {
              ...channel,
              class: "Channel",
              base_class: "Channel",
              state: "available",
              generated_title: channel.title,
              comment_count: 0,
              content: null,
              content_html: null,
              description: null,
              description_html: null,
              source: null,
              image: null,
              visibility: channel.status === "private" ? "private" : "public",
            } as Block;
          }
          return mapBlock(item);
        });
        return {
          items,
          hasMorePages: response.meta.has_more_pages,
        };
      },
      collaborators: async () => {
        const channel = unwrapEnvelopeData(await this.request<unknown>("GET", `channels/${channelIdentifier}`));
        return ensureArray<unknown>(toRecord(channel).collaborators).map(mapUser);
      },
      create: async (title: string, status: ChannelStatus) =>
        this.request<unknown>("POST", "channels", { body: { title, visibility: status } }).then((response) =>
          mapChannel(unwrapEnvelopeData(response)),
        ),
      update: async (opts: { title?: string; status?: ChannelStatus; description?: string }) =>
        this.request<unknown>("PUT", `channels/${channelIdentifier}`, {
          body: {
            title: opts.title,
            visibility: opts.status,
            description: opts.description,
          },
        }).then((response) => mapChannel(unwrapEnvelopeData(response))),
      delete: async (deleteSlug?: string) => {
        const id = channelIdentifier || deleteSlug || "";
        await this.request<void>("DELETE", `channels/${id}`);
      },
      addCollaborators: async (...userIDs: string[]) =>
        this.request<unknown>("POST", `channels/${channelIdentifier}/collaborators`, {
          body: { collaborator_ids: userIDs },
        }).then((result) => ensureArray<unknown>(toRecord(result).data).map(mapUser)),
      deleteCollaborators: async (...userIDs: string[]) =>
        this.request<unknown>("DELETE", `channels/${channelIdentifier}/collaborators`, {
          body: { collaborator_ids: userIDs },
        }).then((result) => ensureArray<unknown>(toRecord(result).data).map(mapUser)),
      createBlock: async (opts: { content: string; source?: string; title?: string; description?: string }) =>
        this.request<unknown>("POST", "blocks", {
          body: {
            value: opts.content,
            source: opts.source,
            title: opts.title,
            description: opts.description,
            channel_ids: [channelIdentifier],
          },
        }).then((response) => mapBlock(unwrapEnvelopeData(response))),
      deleteBlock: async (blockID: string) => {
        await this.request<void>("DELETE", `blocks/${blockID}`);
      },
    };
  }

  block(id?: string | number) {
    const blockId = id ?? "";
    return {
      get: async () =>
        this.request<unknown>("GET", `blocks/${blockId}`).then((response) => mapBlock(unwrapEnvelopeData(response))),
      channels: async (params?: SearchFilters) => {
        const response = await this.getList<unknown>(`blocks/${blockId}/connections`, params);
        return response.items.map(mapChannel);
      },
      create: (channelSlug: string, content: { content: string; title?: string; description?: string }) =>
        this.channel(channelSlug).createBlock(content),
      update: async (opts: { content?: string; title?: string; description?: string }) =>
        this.request<unknown>("PUT", `blocks/${blockId}`, {
          body: {
            value: opts.content,
            title: opts.title,
            description: opts.description,
          },
        }).then((response) => mapBlock(unwrapEnvelopeData(response))),
      delete: async () => {
        await this.request<void>("DELETE", `blocks/${blockId}`);
      },
    };
  }

  connection(id?: string | number) {
    const connectionId = id ?? "";
    return {
      create: async (params: {
        connectable_id: number;
        connectable_type: "Block" | "Channel";
        channel_ids: Array<number | string>;
      }) => this.request("POST", "connections", { body: params }),
      delete: async () => {
        await this.request<void>("DELETE", `connections/${connectionId}`);
      },
    };
  }
}
