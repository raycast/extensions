import { BybitResponse, CommonResponse, OKXResponse } from "@/types";

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
