import { BybitResponse, CommonResponse, OKXResponse } from "@/types";
import { Image } from "@raycast/api";
import { getFavicon } from "@raycast/utils";

export const formatOKXResponse = (response: OKXResponse): CommonResponse => {
  return {
    lastPrice: Number(response.data[0].last).toFixed(2),
    timestamp: response.data[0].ts,
  };
};

export const formatBybitResponse = (response: BybitResponse): CommonResponse => {
  return {
    lastPrice: Number(response.result.list[0].lastPrice).toFixed(2),
    timestamp: response.time.toString(),
  };
};

export const getIcon = (link: { title: string; subtitle?: string; url: string; icon?: string }) => {
  return getFavicon(link.url, {
    fallback: link.icon || undefined,
    mask: Image.Mask.RoundedRectangle,
  });
};
