import { yourls } from "../lib/yourls";
import { GetCreateShortUrlResponse, TAction, TCreateShortUrlParams } from "../types";

export const createShortUrl = async (params: TCreateShortUrlParams) => {
  const action: TAction = "shorturl";
  const res = await yourls<GetCreateShortUrlResponse>({
    action,
    params,
  });

  return res;
};
