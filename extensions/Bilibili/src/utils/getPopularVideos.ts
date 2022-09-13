import { Cache } from "@raycast/api";
import got from "got";
import { API } from "./api";

export async function getPopularVideos() {
  const cache = new Cache();
  const cookie = JSON.parse(cache.get("cookie") || "{}");

  const res: Bilibili.popularVideosResponse = await got(API.popularVideos(1, 25), {
    headers: {
      cookie,
    },
  }).json();

  if (res.code !== 0) throw new Error(res.message);

  return res.data.list;
}
