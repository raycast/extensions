import got from "got";
import { API } from "./api";

export async function getPopularSeriesVideos(number: number) {
  const response: Bilibili.popularSeriesVideosResponse = await got(API.popularSeriesVideos(number)).json();

  if (response.code !== 0) throw new Error(response.message);

  return response.data.list;
}
