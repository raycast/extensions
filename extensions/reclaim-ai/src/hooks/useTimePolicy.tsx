import { getPreferenceValues } from "@raycast/api";
import { NativePreferences } from "../types/preferences";
import { ApiTimePolicy } from "./useTimePolicy.types";
import useApi from "./useApi";

export const useTimePolicy = () => {
  const { apiUrl } = getPreferenceValues<NativePreferences>();
  const { useFetchRai } = useApi();

  const { data: timePolicies, error, isLoading } = useFetchRai<ApiTimePolicy>(`${apiUrl}/timeschemes`);

  if (error) console.error("Error while fetching Time Policies", error);

  return {
    timePolicies,
    error,
    isLoading,
  };
};
