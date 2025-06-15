import useApi from "./useApi";
import { ApiResponseMoment } from "./useEvent.types";

export const useMoment = () => {
  const { data: momentData, error, isLoading } = useApi<ApiResponseMoment>("/moment/next", { keepPreviousData: false });

  if (error) console.error("Error while fetching Moment Next", error);

  return {
    momentData,
    isLoading,
  };
};
