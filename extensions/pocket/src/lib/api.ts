import got from "got";
import { range, uniq } from "lodash";
import { z } from "zod";

const consumerKey = "109214-0976fe3d1062bae6c61267f";

const BookmarkSchema = z
  .discriminatedUnion("status", [
    z.object({
      item_id: z.string(),
      resolved_title: z.string(),
      resolved_url: z.string(),
      given_title: z.string(),
      given_url: z.string(),
      status: z.enum(["0", "1"]),
      is_article: z.enum(["0", "1"]),
      has_video: z.enum(["0", "1", "2"]),
      has_image: z.enum(["0", "1", "2"]),
      favorite: z.enum(["0", "1"]),
      tags: z.record(z.unknown()).optional(),
      authors: z.record(z.object({ name: z.string().optional() })).optional(),
      time_added: z.string(),
      top_image_url: z.string().url().optional(),
      image: z.object({ src: z.string() }).optional(),
    }),
    z.object({
      item_id: z.string(),
      status: z.literal("2"),
    }),
  ])
  .transform((rawBookmark) => {
    if (rawBookmark.status === "2") return null;
    return {
      id: rawBookmark.item_id,
      title: rawBookmark.given_title || rawBookmark.resolved_title,
      originalUrl: rawBookmark.given_url || rawBookmark.resolved_url,
      pocketUrl: `https://getpocket.com/read/${rawBookmark.item_id}`,
      archived: rawBookmark.status === "1",
      type: rawBookmark.has_image === "2" ? "image" : rawBookmark.is_article === "0" ? "video" : "article",
      favorite: rawBookmark.favorite === "1",
      tags: rawBookmark.tags ? Object.keys(rawBookmark.tags) : [],
      author: rawBookmark.authors ? Object.values(rawBookmark.authors)[0]?.name : "",
      updatedAt: new Date(parseInt(`${rawBookmark.time_added}000`)),
      image: rawBookmark.top_image_url || rawBookmark.image?.src,
    };
  });

const BookmarksSchema = z.object({ list: z.record(BookmarkSchema) }).transform((result) => Object.values(result.list));

type RawBookmark = z.input<typeof BookmarkSchema>;
export type Bookmark = Extract<z.output<typeof BookmarkSchema>, { id: string }>;

export class PocketClient {
  private readonly accessToken?: string;
  private api: typeof got;

  constructor({ accessToken }: { accessToken?: string } = {}) {
    this.accessToken = accessToken;

    this.api = got.extend({
      prefixUrl: "https://getpocket.com",
      headers: {
        Accept: "*/*",
        "Content-Type": "application/json",
        "X-Accept": "application/json",
      },
    });
  }

  public async getAuthorizationCode() {
    return this.api
      .post("v3/oauth/request", {
        json: {
          consumer_key: consumerKey,
          redirect_uri: "https://raycast.com/redirect",
        },
      })
      .json<{ code: string }>();
  }

  public async authorize(code: string) {
    return this.api
      .post("v3/oauth/authorize", {
        json: {
          consumer_key: consumerKey,
          code,
        },
      })
      .json<{ access_token: string }>();
  }

  public async createBookmark({ url, title, tags = [] }: CreateBookmarkRequest) {
    const result = await this.api
      .post("v3/add", {
        json: {
          consumer_key: consumerKey,
          access_token: this.accessToken,
          url: encodeURI(url),
          title: title || undefined,
          tags: tags?.length > 0 ? tags.join(",") : undefined,
        },
      })
      .json<{ title: string; resolved_url: string; item_id: string }>();

    return {
      title: result.title,
      url: result.resolved_url,
      pocketUrl: `https://getpocket.com/read/${result.item_id}`,
    };
  }

  public async getBookmarks({
    state,
    tag,
    offset,
    contentType,
    search,
    count,
  }: FetchBookmarksRequest): Promise<Array<Bookmark>> {
    const result = await this.api
      .post("v3/get", {
        json: {
          consumer_key: consumerKey,
          access_token: this.accessToken,
          detailType: "complete",
          sort: "newest",
          count: count ?? 50,
          offset: offset ?? 0,
          contentType,
          tag,
          state,
          search,
        },
      })
      .json<{ list: Record<string, RawBookmark> }>();
    const bookmarks = BookmarksSchema.parse(result).filter((item): item is Bookmark => item !== null);
    return bookmarks.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  }

  public async getTags() {
    const jobs = range(4).map((offset) => this.getBookmarks({ count: 50, offset: offset * 50 }));
    const responses = await Promise.all(jobs);
    return uniq(responses.map((bookmarks) => bookmarks.map((b) => b.tags ?? [])).flat(2));
  }

  public async deleteBookmark(id: string) {
    await this.sendAction({ id, action: "delete" });
  }

  public async archiveBookmark(id: string) {
    await this.sendAction({ id, action: "archive" });
  }

  public async reAddBookmark(id: string) {
    await this.sendAction({ id, action: "readd" });
  }

  public async favoriteBookmark(id: string) {
    await this.sendAction({ id, action: "favorite" });
  }

  public async unfavoriteBookmark(id: string) {
    await this.sendAction({ id, action: "unfavorite" });
  }

  public async addTag(id: string, tag: string) {
    await this.sendAction({ id, action: "tags_add", tags: tag });
  }

  public async removeTag(id: string, tag: string) {
    await this.sendAction({ id, action: "tags_remove", tags: tag });
  }

  private async sendAction({ id, action, ...other }: SendActionRequest) {
    await this.api.post("v3/send", {
      json: {
        consumer_key: consumerKey,
        access_token: this.accessToken,
        actions: [
          {
            ...other,
            action,
            item_id: id,
            time: Math.floor(new Date().getTime() / 1000),
          },
        ],
      },
    });
  }
}

export enum ReadState {
  All = "all",
  Unread = "unread",
  Archive = "archive",
}

export enum ContentType {
  Video = "video",
  Article = "article",
  Image = "image",
}

interface SendActionRequest {
  id: string;
  action: string;

  [key: string]: string;
}

interface FetchBookmarksRequest {
  state?: ReadState;
  count?: number;
  offset?: number;
  tag?: number;
  search?: string;
  contentType?: string;
}

interface CreateBookmarkRequest {
  title?: string;
  tags?: string[];
  url: string;
}
