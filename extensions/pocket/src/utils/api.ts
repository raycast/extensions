import { getPreferenceValues } from "@raycast/api";
import got from "got";
import { Bookmark, ReadState } from "./types";

const preferences = getPreferenceValues();
const consumerKey = preferences.consumerKey;
const accessToken = preferences.accessToken;

const api = got.extend({
  prefixUrl: "https://getpocket.com",
});

interface RawBookmark {
  item_id: string;
  resolved_title: string;
  resolved_url: string;
  given_title: string;
  given_url: string;
  is_article: "0" | "1";
  has_video: "0" | "1" | "2";
  favorite: "0" | "1";
  tags?: Record<string, unknown>;
  authors?: Record<string, { name?: string }>;
  time_added: string;
}

interface SendActionRequest {
  id: string;
  action: string;
}

interface FetchBookmarksRequest {
  state?: ReadState;
  count?: number;
}

interface FetchBookmarksResponse {
  list: Record<string, RawBookmark>;
}

interface CreateBookmarkRequest {
  url: string;
}

function formatBookmark(bookmark: RawBookmark): Bookmark {
  return {
    id: bookmark.item_id,
    title: bookmark.resolved_title || bookmark.given_title,
    originalUrl: bookmark.resolved_url || bookmark.given_url,
    pocketUrl: `https://getpocket.com/read/${bookmark.item_id}`,
    type: bookmark.is_article === "0" ? "video" : "article",
    favorite: bookmark.favorite === "1",
    tags: bookmark.tags ? Object.keys(bookmark.tags) : [],
    author: bookmark.authors ? Object.values(bookmark.authors)[0]?.name : "",
    updatedAt: new Date(parseInt(`${bookmark.time_added}000`)),
  };
}

export async function createBookmark({ url }: CreateBookmarkRequest) {
  const response = await api.post("v3/add", {
    json: {
      consumer_key: consumerKey,
      access_token: accessToken,
      url: encodeURI(url),
    },
  });
  const result = JSON.parse(response.body);
  return formatBookmark(result.item);
}

export async function sendAction({ id, action }: SendActionRequest) {
  await api.post("v3/send", {
    json: {
      consumer_key: consumerKey,
      access_token: accessToken,
      actions: [
        {
          action,
          item_id: id,
          time: Math.floor(new Date().getTime() / 1000),
        },
      ],
    },
  });
}

export async function fetchBookmarks({ state, count }: FetchBookmarksRequest): Promise<Array<Bookmark>> {
  const response = await api.post("v3/get", {
    json: {
      consumer_key: consumerKey,
      access_token: accessToken,
      detailType: "complete",
      sort: "newest",
      count,
      state,
    },
  });
  const result = JSON.parse(response.body) as FetchBookmarksResponse;
  const bookmarks: Array<Bookmark> = Object.values(result.list).map(formatBookmark);
  return bookmarks.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
}
