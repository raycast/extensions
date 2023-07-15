import { useState } from "react";
import reclaimApi from "./useApi";
import { ApiTimePolicy } from "./useTimePolicy.types";
import { axiosPromiseData } from "../utils/axiosPromise";

const useTimePolicy = () => {
  const [isLoading, setIsLoading] = useState(false);
  const { fetcher } = reclaimApi();

  const getTimePolicy = async (feature: string) => {
    try {
      setIsLoading(true);
      const [allPolicies, error] = await axiosPromiseData<ApiTimePolicy>(fetcher("/timeschemes"));

      if (!allPolicies && error) throw error;

      const filteredPolicies = allPolicies?.filter((policy) => !!policy.features.find((f) => f === feature));

      return filteredPolicies;
    } catch (error) {
      console.error("Error fetching time policy ", error);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    getTimePolicy,
    isLoading,
  };
};

export { useTimePolicy };
