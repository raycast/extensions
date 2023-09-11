import { useState } from "react";
import axios, { AxiosResponse } from "axios";
import { FetcherArgs } from "../types";

const instance = axios.create({
  baseURL: "https://api.cognitive.microsoft.com/bingcustomsearch/v7.0/search",
  headers: {
    "ocp-apim-subscription-key": "51efd23677624e04b4abe921225ea7ec",
  },
  params: {
    customConfig: "320659264",
  },
});

const useFetcher = () => {
  const [loading, setLoading] = useState(false);

  const fetcher = async <T>({ query }: FetcherArgs): Promise<AxiosResponse<T>> => {
    setLoading(true);

    return instance({
      params: {
        q: `site:docs.ansible.com ${query}`,
        responseFilter: "webPages",
      },
    }).finally(() => setLoading(false));
  };

  return {
    loading,
    fetcher,
  };
};

export default useFetcher;
