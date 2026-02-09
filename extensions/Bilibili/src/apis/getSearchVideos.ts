import { API } from "./api";
import { getJson } from "./request";

export async function getSearchVideos(idx: number, keyword: string) {
  const params = {
    page: idx,
    page_size: 42,
    keyword,
  };

  const res = await getJson<Bilibili.SearchVideosResponse>(API.searchVideos(), {
    searchParams: {
      ...params,
    },
  });

  if (res.code !== 0) throw new Error(res.message);

  const videoResult = res.data.result?.find((item) => item.result_type === "video");
  return videoResult?.data ?? [];
}
