import { API } from "./api";

import got from "got";
import { Cache } from "@raycast/api";

export async function getDynamicFeed() {
  const cache = new Cache();
  const cookie = JSON.parse(cache.get("cookie") || "{}");

  const res: Bilibili.dynamicFeedAllResponse = await got(API.dynamicFeedAll(1, -480), {
    headers: {
      cookie,
    },
  }).json();

  if (res.code !== 0) throw new Error(res.message);

  const dynamicVideoFeed: Bilibili.dynamicVideoFeedAll = res.data.items.filter(
    (item) => item.type === "DYNAMIC_TYPE_AV"
  );

  return dynamicVideoFeed;
}
