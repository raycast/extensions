import { yourls } from "../lib/yourls";
import { GetCreateShortUrlResponse, GetStatsResponse, TAction, TCreateShortUrlParams, TGetStatsParams } from "../types";

export const createShortUrl = async (params: TCreateShortUrlParams) => {
  const action: TAction = "shorturl";
  const res = await yourls<GetCreateShortUrlResponse>({
    action,
    params,
  });

  return res;
};

export const getStats = async (params: TGetStatsParams) => {
  const action: TAction = "stats";
  const res = await yourls<GetStatsResponse>({
    action,
    params,
  });

  return res;
};
