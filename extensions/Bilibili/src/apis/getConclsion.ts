import got from "got";
import { Cache } from "@raycast/api";
import { encWbi } from "../utils";
import { API } from "./api";

export async function getConclsion(bvid: string, cid: number, up_mid: number) {
  const cache = new Cache();
  const cookie = cache.get("cookie") || "{}";
  const params = {
    bvid,
    cid,
    up_mid,
  };
  const { w_rid, wts } = await encWbi(params);

  const res: Bilibili.VideoConclusionResponse = await got(API.conclusion(), {
    searchParams: {
      w_rid,
      wts,
      ...params,
    },
    headers: {
      cookie,
    },
  }).json();

  if (res.code !== 0) throw new Error(res.message);

  return res.data;
}
