import useSWR from "swr";
import { ISite } from "../types";
import fetch from "node-fetch";
import { findValidUrlsFromSite } from "../lib/url";
import { USE_FAKE_DATA } from "../config";

const fetcher = async (site: ISite) => {
  if (USE_FAKE_DATA) return site.name as string;
  const urls = findValidUrlsFromSite(site);
  // Grab the first url to respond
  const res = await Promise.any(
    // http will redirect
    urls.map((url) => fetch(`http://${url}`, { method: "HEAD" }))
  );
  return res?.url;
};

export const useIsSiteOnline = (site: ISite) => {
  const { data, error } = useSWR<string>(site?.id ? site : null, fetcher, {
    refreshInterval: 1_000,
  });

  return {
    isOnline: data ? true : false,
    url: data,
    loading: !error && !data,
    error: error,
  };
};
