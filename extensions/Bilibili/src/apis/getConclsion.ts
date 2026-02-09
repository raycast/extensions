import { encWbi } from "../utils";
import { API } from "./api";
import { getJson } from "./request";

function isSubtitleUnavailable(message: string) {
  const lower = message.toLowerCase();
  return (
    lower.includes("无字幕") || lower.includes("暂无字幕") || lower.includes("subtitle") || lower.includes("caption")
  );
}

export async function getConclsion(bvid: string, cid: number, up_mid: number) {
  const params = {
    bvid,
    cid,
    up_mid,
  };
  const { w_rid, wts } = await encWbi(params);

  const res = await getJson<Bilibili.VideoConclusionResponse>(API.conclusion(), {
    searchParams: {
      w_rid,
      wts,
      ...params,
    },
  });

  if (res.code !== 0) {
    if (isSubtitleUnavailable(res.message || "")) return null;
    throw new Error(res.message);
  }

  return res.data;
}
