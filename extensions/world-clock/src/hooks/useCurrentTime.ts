import axios from "axios";
import { API_CURRENT_TIME } from "../utils/costants";
import { CurrentTime } from "../types/types";
import { useCachedPromise } from "@raycast/utils";

export const getRegionTime = async (timezone: string) => {
  try {
    const axiosResponse = await axios({
      method: "GET",
      url: API_CURRENT_TIME,
      params: {
        timeZone: timezone,
      },
    });
    return axiosResponse.data as CurrentTime;
  } catch (error) {
    console.error("Error while fetching region time", error);
    return {} as CurrentTime;
  }
};

export function useCurrentTime(timezone: string) {
  return useCachedPromise(
    (timezone: string) => {
      return getRegionTime(timezone) as Promise<CurrentTime>;
    },
    [timezone],
  );
}
