import { API } from "./api";

import got from "got";

export async function getPopularSeriesVideos(number: number) {
  const response: Bilibili.PopularSeriesVideosResponse = await got(API.popularSeriesVideos(number)).json();

  if (response.code !== 0) throw new Error(response.message);

  return response.data.list;
}
