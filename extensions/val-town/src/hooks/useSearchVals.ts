import { getPreferenceValues } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { API_URL } from "../constants";
import { Profile, UserVal, Val } from "../types";

const { apiToken } = getPreferenceValues();

type ValsResponse = {
  data: Val[];
  links: {
    next?: string;
    prev?: string;
  };
};

export const useSearchVals = (search?: string) => {
  // TODO: Add pagination
  const { isLoading, data } = useFetch<ValsResponse>(`${API_URL}/search/vals?limit=100&query=${search}`, {
    execute: !!search,
    headers: {
      Authorization: `Bearer ${apiToken}`,
    },
  });
  const { data: vals, links } = data || { data: undefined, links: undefined };
  return { isLoading, vals, links };
};
