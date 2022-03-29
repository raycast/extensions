import { useState } from "react";
import useSWR from "swr";
import { getPreferences } from "../preferences";
import { fetchReadwise } from "./fetcher";
import { useHandleError } from "./useHandleError";

export const useDetailApi = <T>(endpoint: string) => {
  const { data, error, isValidating } = useSWR<T, HTTPError>(endpoint, fetchReadwise);
  useHandleError(error);

  return {
    data,
    loading: (!data && !error) || isValidating,
  };
};

type DefaultParams = { page_size?: number };

const { pageSize } = getPreferences();

export const DEFAULT_LIST_PARAMS = { page_size: pageSize };

export const useListApi = <T, Params extends DefaultParams>(endpoint: string, defaultParams?: Params) => {
  const [params, setParams] = useState(defaultParams || DEFAULT_LIST_PARAMS);

  const { data, error, isValidating } = useSWR<T, HTTPError>([endpoint, params], fetchReadwise);
  useHandleError(error);

  return {
    data,
    loading: (!data && !error) || isValidating,
    setParams,
  };
};
