import useSWR from "swr";
import { getPreferenceValues } from "@raycast/api";
import got from "got";

const preferences = getPreferenceValues();
const consumerKey = preferences.consumerKey;
const accessToken = preferences.accessToken;

const api = got.extend({
  prefixUrl: "https://getpocket.com"
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
  time_updated: string;
}

interface GetResponse {
  list: Record<string, RawBookmark>;
}

interface Bookmark {
  id: string;
  title: string;
  url: string;
  type: "article" | "video";
  favorite: boolean;
  tags: Array<string>;
  updatedAt: Date;
}

interface UseBookmarksOptions {
  search?: string;
}

export function useBookmarks({ search }: UseBookmarksOptions) {
  const { data, error } = useSWR<Array<Bookmark>>(["v3/get", search], async (url, search) => {
    const response = await api.post(url, {
      json: {
        consumer_key: consumerKey,
        access_token: accessToken,
        detailType: "complete",
        search
      }
    });
    const result: GetResponse = JSON.parse(response.body);
    return Object.values(result.list).map(bookmark => ({
      id: bookmark.item_id,
      title: bookmark.resolved_title || bookmark.given_title,
      url: bookmark.resolved_url || bookmark.given_url,
      type: bookmark.is_article === "0" ? "video" : "article",
      favorite: bookmark.favorite === "1",
      tags: bookmark.tags ? Object.keys(bookmark.tags) : [],
      updatedAt: new Date(parseInt(`${bookmark.time_updated}000`))
    }));
  });

  return { bookmarks: data || [], loading: !data && !error };
}