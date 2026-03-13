import { getPreferenceValues } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { API_URL } from "../constants";
import { UserVal } from "../types";

const { apiToken } = getPreferenceValues();

type ValsResponse = {
  data: UserVal[];
  links: {
    next?: string;
    prev?: string;
  };
};

export const useLikedVals = (userId = "123") => {
  // TODO: Add pagination
  // Currently this endpoint os /me only
  const { isLoading, data } = useFetch<ValsResponse>(`${API_URL}/me/likes?limit=100`, {
    execute: !!userId,
    headers: {
      Authorization: `Bearer ${apiToken}`,
    },
  });
  const { data: vals, links } = data || { data: undefined, links: undefined };
  return { isLoading, vals, links };
};
