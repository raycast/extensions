import { API } from "./api";
import { getJson } from "./request";

export async function getRcmd(idx: number) {
  const fetch_row = idx * 4;
  const fresh_idx_1h = idx;
  const fresh_idx = idx;
  const brush = idx;

  const response = await getJson<Bilibili.RcmdVideosResponse>(
    API.rcmdVideos(fresh_idx_1h, fetch_row, fresh_idx, brush)
  );

  if (response.code !== 0) throw new Error(response.message);

  return response.data.item;
}
