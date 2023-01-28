import { Cache } from "@raycast/api";
import { Storage, ListData } from "../types";

export const cache = new Cache();

if (!cache.has(Storage.List)) cache.set(Storage.List, JSON.stringify([]));
if (!cache.has(Storage.AlivePidList)) cache.set(Storage.AlivePidList, JSON.stringify([]));

export const useCache = () => {
  const cachedListStr = cache.get(Storage.List);
  const cachedList = JSON.parse(cachedListStr as string) as ListData[];
  const alivePidListStr = cache.get(Storage.AlivePidList);
  const alivePidList = JSON.parse(alivePidListStr as string) as string[];
  const alivePidSet = new Set(alivePidList);

  return {
    cachedList,
    alivePidSet,
  };
};
