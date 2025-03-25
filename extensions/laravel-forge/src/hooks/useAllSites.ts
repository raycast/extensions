import useSWR from "swr";
import { ISite } from "../types";
import { Site } from "../api/Site";
import { unwrapToken } from "../lib/auth";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const fetcher = ([_, tokenKey]: [unknown, string]) =>
  Site.getSitesWithoutServer({
    token: unwrapToken(tokenKey),
  });

export const useAllSites = (tokenKey: string) => {
  const { data, error } = useSWR<ISite[]>(["all-sites", tokenKey], fetcher, {
    refreshInterval: 60_000 * 5,
  });

  return {
    sites: data,
    loading: !error && !data,
    error: error,
  };
};
