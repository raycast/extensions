import { getPreferenceValues } from "@raycast/api";
import { ShlinkPagination } from "./types";
import { useFetch } from "@raycast/utils";
import fetch from "node-fetch";
import { UseCachedPromiseReturnType } from "@raycast/utils/dist/types";

type FetchData<DataKey extends string, DataObjects> = {
  [key in DataKey]: {
    data: DataObjects[];
  };
} & {
  pagination: ShlinkPagination;
};

type extractDataByKeyType = string;

export function useApiFetchPaginationExtract<DataObject>(restPath: string, extractDataByKey: extractDataByKeyType) {
  const { data: rawData, ...other } = useApiFetchPagination<extractDataByKeyType, DataObject>(restPath);
  return {
    data: rawData ? rawData[extractDataByKey].data : ([] as DataObject[]),
    ...other,
  };
}

export function useApiFetchPagination<DataKey extends string, DataObject>(
  restPath: string
): UseCachedPromiseReturnType<FetchData<DataKey, DataObject>, undefined> {
  return useApiFetchSimple<FetchData<DataKey, DataObject>>(restPath);
}

export function useApiFetchSimple<DataObject extends object>(restPath: string) {
  return useApiFetch<DataObject>({ restPath, method: "GET" });
}

export function useApiFetch<DataObject extends object>({
  restPath,
  method,
  data,
}: {
  restPath: string;
  method: string;
  data?: string;
}) {
  const pref = getPreferenceValues<Preferences>();
  return useFetch<DataObject>(`${pref.shlinkUrl}/rest/v3/${restPath}`, {
    method: method,
    headers: {
      "X-Api-Key": pref.shlinkApiKey,
    },
    body: data,
    keepPreviousData: true,
  });
}

export async function apiFetch({ restPath, method, data }: { restPath: string; method: string; data?: string }) {
  const pref = getPreferenceValues<Preferences>();
  const url = `${pref.shlinkUrl}/rest/v3/${restPath}`;
  const res = await fetch(url, {
    method: method,
    headers: {
      "X-Api-Key": pref.shlinkApiKey,
    },
    body: data,
  });
  return { response: res, text: await res.text() };
}
