import useApi from "./useApi";
import { ApiResponseMoment } from "./useEvent.types";

export const useMoment = () => {
  const { useFetchRai } = useApi();

  const { data: momentData, error, isLoading } = useFetchRai<ApiResponseMoment>("/moment/next");

  if (error) console.error("Error while fetching Moment Next", error);

  return {
    momentData,
    isLoading,
  };
};
