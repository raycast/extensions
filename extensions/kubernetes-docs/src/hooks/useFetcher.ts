import { useState } from "react";
import axios, { AxiosResponse } from "axios";
import { FetcherArgs } from "../types";

const instance = axios.create({
  baseURL: "https://kubernetes-io-search.azurewebsites.net/api/bingsearchproxy",
});

const useFetcher = () => {
  const [loading, setLoading] = useState(false);

  const fetcher = async <T>({ query, offset = 0 }: FetcherArgs): Promise<AxiosResponse<T>> => {
    setLoading(true);

    return instance({
      params: {
        q: query,
        offset,
      },
    }).finally(() => setLoading(false));
  };

  return {
    loading,
    fetcher,
  };
};

export default useFetcher;
