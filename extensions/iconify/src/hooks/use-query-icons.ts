import { useMemo, useRef } from "react";
import { createURL, ICONIFY_BASE_URL, getIcons } from "../api/service";
import { showFailureToast, useFetch, usePromise } from "@raycast/utils";
import { QueryResponse, SetResponse } from "../types";

type QuerySet = { setId: string; name: string; ids: string[] };

export const useQueryIcons = (query: string) => {
  //@ts-expect-error React issue, this works fine
  const abortable = useRef<AbortController>();
  const url = useMemo(() => {
    return createURL(ICONIFY_BASE_URL, `/search`, {
      query,
      limit: "100",
    });
  }, [query]);

  const {
    data: queryData,
    error: queryError,
    isLoading: queryLoading,
  } = useFetch<QueryResponse>(url, {
    execute: !!query,
    onError: (error) => {
      showFailureToast(error, { title: "Error while searching for icons" });
    },
  });

  const iconSets = useMemo(() => {
    const setMap: Record<string, string[]> = {};
    const icons: string[][] = (queryData?.icons || []).map((s) => s.split(":"));
    const collections: Record<string, SetResponse> = queryData?.collections || {};
    for (const [setId, id] of icons) {
      if (!setMap[setId]) {
        setMap[setId] = [];
      }
      setMap[setId].push(id);
    }
    const sets: Array<QuerySet> = [];
    for (const setId in setMap) {
      const ids = setMap[setId];
      const set = collections[setId];
      sets.push({ setId, name: set.name, ids });
    }
    return sets;
  }, [queryData]);

  const {
    data: icons,
    error: getIconsError,
    isLoading: getIconsLoading,
  } = usePromise(
    async (sets: Array<QuerySet>) => {
      return Promise.all(
        sets.map((dataset) => getIcons(dataset.setId, dataset.name, dataset.ids, abortable?.current?.signal)),
      ).then((value) => value.flat());
    },
    [iconSets],
    {
      abortable,
      onError: (error) => {
        showFailureToast(error, { title: "Error while searching for icons" });
      },
    },
  );

  return {
    data: icons || [],
    error: queryError || getIconsError,
    isLoading: queryLoading || getIconsLoading,
  };
};
