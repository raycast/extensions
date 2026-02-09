import { API } from "./api";
import { getJson } from "./request";

export async function getDynamicFeed() {
  const res = await getJson<Bilibili.DynamicFeedAllResponse>(API.dynamicFeedAll(1, -480));

  if (res.code !== 0) throw new Error(res.message);

  return res.data.items;
}
