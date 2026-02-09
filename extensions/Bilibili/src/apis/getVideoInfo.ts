import { API } from "./api";
import { getJson } from "./request";

export async function getVideoInfo(id: string) {
  const res = await getJson<Bilibili.VideoInfoResponse>(API.videoInfo(id));

  if (res.code !== 0) throw new Error(res.message);

  return res.data;
}
