import got from "got";
import { range, uniq } from "lodash";

const consumerKey = "109214-0976fe3d1062bae6c61267f";

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
      .json<FetchBookmarksResponse>();
    const bookmarks: Array<Bookmark> = Object.values(result.list).map(formatBookmark);
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

export interface Bookmark {
  id: string;
  title: string;
  originalUrl: string;
  pocketUrl: string;
  type: "article" | "video" | "image";
  archived: boolean;
  favorite: boolean;
  tags: Array<string>;
  author?: string;
  updatedAt: Date;
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

interface RawBookmark {
  item_id: string;
  resolved_title: string;
  resolved_url: string;
  given_title: string;
  given_url: string;
  status: "0" | "1" | "2";
  is_article: "0" | "1";
  has_video: "0" | "1" | "2";
  has_image: "0" | "1" | "2";
  favorite: "0" | "1";
  tags?: Record<string, unknown>;
  authors?: Record<string, { name?: string }>;
  time_added: string;
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

interface FetchBookmarksResponse {
  list: Record<string, RawBookmark>;
}

interface CreateBookmarkRequest {
  title?: string;
  tags?: string[];
  url: string;
}

function formatBookmark(bookmark: RawBookmark): Bookmark {
  return {
    id: bookmark.item_id,
    title: bookmark.given_title || bookmark.resolved_title,
    originalUrl: bookmark.resolved_url || bookmark.given_url,
    pocketUrl: `https://getpocket.com/read/${bookmark.item_id}`,
    archived: bookmark.status === "1",
    type: bookmark.has_image === "2" ? "image" : bookmark.is_article === "0" ? "video" : "article",
    favorite: bookmark.favorite === "1",
    tags: bookmark.tags ? Object.keys(bookmark.tags) : [],
    author: bookmark.authors ? Object.values(bookmark.authors)[0]?.name : "",
    updatedAt: new Date(parseInt(`${bookmark.time_added}000`)),
  };
}
