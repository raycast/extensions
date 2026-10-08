import useSWR from "swr";
import { ISite } from "../types";
import { fleetSites } from "../lib/fleet";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const fetcher = ([_, tokenKey]: [unknown, string]) => fleetSites(tokenKey);

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
