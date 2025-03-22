import { API } from "./api";

import got from "got";
import { Cache } from "@raycast/api";

export async function getDynamicFeed() {
  const cache = new Cache();
  const cookie = cache.get("cookie") || "{}";

  const res: Bilibili.DynamicFeedAllResponse = await got(API.dynamicFeedAll(1, -480), {
    headers: {
      cookie,
    },
  }).json();

  if (res.code !== 0) throw new Error(res.message);

  return res.data.items;
}
