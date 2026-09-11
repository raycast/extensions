import useSWR from "swr";
import { serverKeywords } from "../api/Server";

export const useServerKeywords = () => {
  const { data } = useSWR<Record<number, string[]>>("server-keywords", serverKeywords);
  return data;
};
