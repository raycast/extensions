import { API } from "./api";

import got from "got";
import { Cache } from "@raycast/api";

export async function getRcmd(idx: number) {
  const cache = new Cache();
  const cookie = cache.get("cookie") || "{}";

  const fetch_row = idx * 4;
  const fresh_idx_1h = idx;
  const fresh_idx = idx;
  const brush = idx;

  const response: Bilibili.RcmdVideosResponse = await got(API.rcmdVideos(fresh_idx_1h, fetch_row, fresh_idx, brush), {
    headers: {
      cookie,
    },
  }).json();

  if (response.code !== 0) throw new Error(response.message);

  return response.data.item;
}
