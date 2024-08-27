import axios from "axios";
import { TIMEZONE_BASE_URL } from "../utils/costants";
import { useCachedPromise } from "@raycast/utils";

const getAllTimezones = async () => {
  const axiosResponse = await axios({
    method: "GET",
    url: TIMEZONE_BASE_URL,
  });
  return axiosResponse.data as string[];
};

export function useAllTimezones() {
  return useCachedPromise(() => {
    return getAllTimezones() as Promise<string[]>;
  });
}
