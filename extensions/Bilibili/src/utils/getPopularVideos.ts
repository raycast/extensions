import { API } from "./api";

import got from "got";
import { Cache } from "@raycast/api";

export async function getPopularVideos(pn: number) {
  const cache = new Cache();
  const cookie = cache.get("cookie") || "{}";

  const res: Bilibili.popularVideosResponse = await got(API.popularVideos(pn, 20), {
    headers: {
      cookie,
    },
  }).json();

  if (res.code !== 0) throw new Error(res.message);

  return res.data.list;
}
