import { useCachedPromise } from "@raycast/utils";
import { Domain } from "../types/types";
import { DOMAINS_API } from "../utils/constants";
import axios from "axios";
import { apiKey } from "../types/preferences";

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
    .catch((err) => {
      console.error(err);
      return [];
    });
};
