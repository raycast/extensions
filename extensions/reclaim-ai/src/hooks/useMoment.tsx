import { getPreferenceValues } from "@raycast/api";
import { NativePreferences } from "../types/preferences";
import { ApiResponseMoment } from "./useEvent.types";
import useApi from "./useApi";

export const useMoment = () => {
  const { apiUrl } = getPreferenceValues<NativePreferences>();
  const { useFetchRai } = useApi();

  const { data: momentData, error, isLoading } = useFetchRai<ApiResponseMoment>(`${apiUrl}/moment/next`);

  if (error) console.error("Error while fetching Moment Next", error);

  return {
    momentData,
    isLoading,
  };
};
