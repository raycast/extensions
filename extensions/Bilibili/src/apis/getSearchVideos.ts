import got from "got";
import { Cache } from "@raycast/api";
import { API } from "./api";

export async function getSearchVideos(idx: number, keyword: string) {
  const cache = new Cache();
  const cookie = cache.get("cookie") || "{}";

  const params = {
    page: idx,
    page_size: 42,
    keyword,
  };

  const res: Bilibili.SearchVideosResponse = await got(API.searchVideos(), {
    searchParams: {
      ...params,
    },
    headers: {
      cookie,
    },
  }).json();

  if (res.code !== 0) throw new Error(res.message);

  return res.data.result.filter((item) => item.result_type === "video")[0].data || [];
}
