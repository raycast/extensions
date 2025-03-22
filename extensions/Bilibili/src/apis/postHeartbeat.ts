import { API } from "./api";

import got from "got";
import { Cache } from "@raycast/api";

export async function postHeartbeat(aid: number, cid: number) {
  const cache = new Cache();
  const cookie = cache.get("cookie");

  const response: Bilibili.BaseResponse = await got
    .post(API.heartbeat(), {
      headers: {
        cookie,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: `played_time=1&aid=${aid}&cid=${cid}&csrf=${cookie?.match(/bili_jct=(.*?);/)?.[1]}`,
    })
    .json();

  if (response.code !== 0) throw new Error(response.message);

  return response;
}
