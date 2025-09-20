import { API } from "./api";

import got from "got";
import { Cache } from "@raycast/api";

export async function logout() {
  const cache = new Cache();
  const cookie = cache.get("cookie");

  const response: Bilibili.LogoutResponse = await got
    .post(API.logout(), {
      headers: {
        cookie,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: `biliCSRF=${cookie?.match(/bili_jct=(.*?);/)?.[1]}`,
    })
    .json();

  if (response.code !== 0) throw new Error(response.message);

  cache.remove("cookie");
  cache.remove("expires");

  return response.status;
}
