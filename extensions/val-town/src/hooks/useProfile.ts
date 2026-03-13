import { getPreferenceValues } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { API_URL } from "../constants";
import { Profile } from "../types";

const { apiToken } = getPreferenceValues();

export const useProfile = (userId?: Profile["id"]) => {
  const endpoint = userId ? `${API_URL}/users/${userId}` : `${API_URL}/me`;
  const {
    isLoading,
    data: profile,
    error,
  } = useFetch<Profile>(endpoint, {
    keepPreviousData: true,
    headers: {
      Authorization: `Bearer ${apiToken}`,
    },
  });
  return { isLoading, profile, error };
};
