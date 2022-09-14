import got from "got";
import { API } from "./api";

export async function getPopularSeriesList() {
  const response: Bilibili.popularSeriesListResponse = await got(API.popularSeriesList()).json();

  if (response.code !== 0) throw new Error(response.message);

  return response.data.list;
}
