import useApi from "./useApi";
import { ApiTimePolicy } from "./useTimePolicy.types";

export const useTimePolicy = () => {
  const { useFetchRai } = useApi();

  const { data: timePolicies, error, isLoading } = useFetchRai<ApiTimePolicy>("/timeschemes");

  if (error) console.error("Error while fetching Time Policies", error);

  return {
    timePolicies,
    error,
    isLoading,
  };
};
