import { getPreferenceValues } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { Pricing } from "./types";

type ErrorResponse =
  | {
      result: "fail";
      messages: {
        [key: string]: string[];
      };
    }
  | {
      message: string;
    };
export default function useGet<T>(
  endpoint: string,
  { execute = true, onData }: { execute?: boolean; onData?: (data: T[]) => void } = {},
) {
  const { url, api_key } = getPreferenceValues<Preferences>();
  const api_url = new URL(`api/${endpoint}`, url).toString();
  return useFetch(api_url, {
    method: "GET",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${api_key}`,
    },
    async parseResponse(response) {
      if (!response.ok) {
        const result: ErrorResponse = await response.json();
        if ("message" in result) throw new Error(result.message);
        throw new Error(Object.values(result.messages)[0][0]);
      }
      const result: T[] = await response.json();
      return result;
    },
    initialData: [],
    execute,
    onData,
  });
}

export function useGetPricing({ execute = true, onData }: { execute?: boolean; onData?: () => void } = {}) {
  const { url, api_key } = getPreferenceValues<Preferences>();
  const api_url = new URL("api/pricing", url).toString();
  return useFetch(api_url, {
    method: "GET",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${api_key}`,
    },
    async parseResponse(response) {
      if (!response.ok) {
        const result: ErrorResponse = await response.json();
        if ("message" in result) throw new Error(result.message);
        throw new Error(Object.values(result.messages)[0][0]);
      }
      const result: Pricing[] = await response.json();
      return result;
    },
    initialData: {
      weekly: "?",
      monthly: "?",
      yearly: "?",
    },
    mapResult(result) {
      let weekly = 0;
      let monthly = 0;
      let inactive = 0;

      result.map((price) => {
        if (price.active) {
          // assume USD
          const val = +price.as_usd;

          switch (price.term) {
            case 1:
              weekly += val / 4;
              monthly += val;
              break;
            case 2:
              weekly += val / 12;
              monthly += val / 3;
              break;
            case 3:
              weekly += val / 24;
              monthly += val / 6;
              break;
            case 4:
              weekly += val / 48;
              monthly += val / 12;
              break;
            case 5:
              weekly += val / 96;
              monthly += val / 24;
              break;
            case 6:
              weekly += val / 144;
              monthly += val / 36;
              break;
          }
        } else {
          inactive++;
        }
      });
      const yearly = monthly * 12;

      return {
        data: {
          weekly: `${weekly.toFixed(2)} USD`,
          monthly: `${monthly.toFixed(2)} USD`,
          yearly: `${yearly.toFixed(2)} USD`,
          inactive,
        },
      };
    },
    execute,
    onData,
  });
}
