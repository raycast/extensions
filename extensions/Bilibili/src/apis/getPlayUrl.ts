import { API } from "./api";
import { getJson } from "./request";

export async function getPlayUrl(bvid: string, cid: string) {
  const res = await getJson<Bilibili.PlayUrlResponse>(API.playUrl(bvid, cid));

  if (res.code !== 0) throw new Error(res.message);

  return res.data;
}
