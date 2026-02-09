import { API } from "./api";
import { getJson } from "./request";
import { Cache } from "@raycast/api";

export async function postHeartbeat(aid: number, cid: number) {
  const cache = new Cache();
  const cookie = cache.get("cookie");

  const response = await getJson<Bilibili.BaseResponse>(API.heartbeat(), {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: `played_time=1&aid=${aid}&cid=${cid}&csrf=${cookie?.match(/bili_jct=(.*?);/)?.[1]}`,
  });

  if (response.code !== 0) throw new Error(response.message);

  return response;
}
