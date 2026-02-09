import { API } from "./api";
import { getJson } from "./request";

export async function getCid(bvid: string) {
  const res = await getJson<Bilibili.BvidGetCidResponse>(API.bvidGetCid(bvid));

  if (res.code !== 0) throw new Error(res.message);
  if (res.data.length <= 0) throw new Error("Not found cid with this bvid!");

  return res.data[0];
}
