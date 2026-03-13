import axios from "axios";
import { API_ALL_TIMEZONE } from "../utils/costants";
import { useCachedPromise } from "@raycast/utils";

const getAllTimezones = async () => {
  const axiosResponse = await axios({
    method: "GET",
    url: API_ALL_TIMEZONE,
  });
  return axiosResponse.data as string[];
};

export function useAllTimezones() {
  return useCachedPromise(() => {
    return getAllTimezones() as Promise<string[]>;
  });
}
