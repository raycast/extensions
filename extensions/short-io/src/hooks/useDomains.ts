import { useCachedPromise } from "@raycast/utils";
import { Domain } from "../types/types";
import { DOMAINS_API } from "../utils/constants";
import { apiKey } from "../types/preferences";
import axios from "axios";

export const useDomains = () => {
  return useCachedPromise(() => {
    return getDomains() as Promise<Domain[]>;
  }, []);
};
const getDomains = async () => {
  const apiRes = axios.get(DOMAINS_API, {
    headers: { accept: "application/json", authorization: apiKey },
  });
  return apiRes
    .then((res) => {
      return res.data as Domain[];
    })
    .catch(() => {
      return [];
    });
};
