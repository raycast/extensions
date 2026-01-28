import { getPreferenceValues } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { API_URL } from "../constants";
import { Profile, UserVal } from "../types";

const { apiToken } = getPreferenceValues();

type ValsResponse = {
  data: UserVal[];
  links: {
    next?: string;
    prev?: string;
  };
};

export const useUserVals = (userId?: Profile["id"]) => {
  // TODO: Add pagination
  const { isLoading, data, error } = useFetch<ValsResponse>(`${API_URL}/users/${userId}/vals?limit=100`, {
    execute: !!userId,
    headers: {
      Authorization: `Bearer ${apiToken}`,
    },
  });
  const { data: vals, links } = data || { data: undefined, links: undefined };
  return { isLoading, vals, links, error };
};
