import { API } from "./api";

import got from "got";
import { Cache } from "@raycast/api";

export async function getVideoInfo(id: string) {
  const cache = new Cache();
  const cookie = cache.get("cookie") || "{}";

  const res: Bilibili.VideoInfoResponse = await got(API.videoInfo(id), {
    headers: {
      cookie,
    },
  }).json();

  if (res.code !== 0) throw new Error(res.message);

  return res.data;
}
