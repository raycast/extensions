import got from "got";
import { API } from "./api";

export async function getCid(bvid: string) {
  const res: Bilibili.BvidGetCidResponse = await got(API.bvidGetCid(bvid)).json();

  if (res.code !== 0) throw new Error(res.message);
  if (res.data.length <= 0) throw new Error("Not found cid with this bvid!");

  return res.data[0];
}
