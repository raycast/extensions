import got from "got";
import crypto from "crypto";
import { Cache } from "@raycast/api";

function getMixinKey(ae: string) {
  const oe = [
    46, 47, 18, 2, 53, 8, 23, 32, 15, 50, 10, 31, 58, 3, 45, 35, 27, 43, 5, 49, 33, 9, 42, 19, 29, 28, 14, 39, 12, 38,
    41, 13, 37, 48, 7, 16, 24, 55, 40, 61, 26, 17, 0, 1, 60, 51, 30, 4, 22, 25, 54, 21, 56, 59, 6, 63, 57, 62, 11, 36,
    20, 34, 44, 52,
  ];
  const le = oe.reduce((s, i) => s + ae[i], "");

  return le.slice(0, 32);
}

function md5(s: string) {
  return crypto.createHash("md5").update(s, "utf8").digest("hex");
}

function split(s: string) {
  const parts = s.split("/");
  return parts[parts.length - 1].split(".")[0];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function encWbi(params: any) {
  const cache = new Cache();
  const cookie = cache.get("cookie") || "{}";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const resp: any = await got("https://api.bilibili.com/x/web-interface/nav", {
    headers: {
      cookie,
    },
  }).json();
  const wbi_img = resp.data.wbi_img;
  const img_url = wbi_img.img_url || "";
  const sub_url = wbi_img.sub_url || "";
  const img_value = split(img_url);
  const sub_value = split(sub_url);
  const me = getMixinKey(img_value + sub_value);
  const wts = Math.floor(Date.now() / 1000);

  params.wts = wts;

  const Ae = Object.entries(params)
    .map(([key, value]) => `${key}=${value}`)
    .join("&");
  const w_rid = md5(Ae + me);

  return { w_rid, wts };
}
