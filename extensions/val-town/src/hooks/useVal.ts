import { getPreferenceValues } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { API_URL } from "../constants";
import { Val } from "../types";

const { apiToken } = getPreferenceValues();

export const useVal = (valId?: Val["id"]) => {
  const { isLoading, data: val } = useFetch<Val>(`${API_URL}/vals/${valId}`, {
    execute: !!valId,
    keepPreviousData: true,
    headers: {
      Authorization: `Bearer ${apiToken}`,
    },
  });
  return { isLoading, val };
};
