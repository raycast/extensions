import { API } from "./api";

import got from "got";
import { Cache } from "@raycast/api";

export async function getPlayUrl(bvid: string, cid: string) {
  const cache = new Cache();
  const cookie = cache.get("cookie") || "{}";

  const res: Bilibili.PlayUrlResponse = await got(API.playUrl(bvid, cid), {
    headers: {
      cookie,
    },
  }).json();

  if (res.code !== 0) throw new Error(res.message);

  return res.data;
}
