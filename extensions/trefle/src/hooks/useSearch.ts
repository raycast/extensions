import { useState } from "react";
import { showFailureToast, useFetch, usePromise } from "@raycast/utils";
import type { FiltersPlants, ListPlants200Response, SpeciesLight } from "@/api/trefle/api";
import useParams from "@/hooks/useParams";

export type SearchResult = {
  plants: SpeciesLight[];
  total: number;
};

const emptyResponse = () =>
  Promise.resolve({
    meta: {
      total: 0,
    },
    links: {
      self: "null",
      first: "null",
      last: "null",
      next: "null",
    },
    data: [],
  } as ListPlants200Response);

const useSearch = (query: string, filter?: FiltersPlants) => {
  const { searchPlants } = useParams();
  const { data: requestArgs } = usePromise(searchPlants, [query, undefined, filter]);
  const [total, setTotal] = useState<number>(0);

  const { data, ...rest } = useFetch<ListPlants200Response, SpeciesLight[], SpeciesLight[]>(
    (options) => {
      const page = options.page + 1;
      const newUrl =
        `https://trefle.io${requestArgs ? requestArgs.url : ""}&` +
        new URLSearchParams({ page: String(page) }).toString();
      return newUrl;
    },
    {
      initialData: [],
      execute: !!requestArgs && query.length > 1,
      keepPreviousData: true,
      mapResult: (result) => {
        const hasMore = result.links?.self !== result.links?.last;
        if (result.meta?.total) {
          setTotal(result.meta.total);
        }
        return {
          data: result.data || [],
          cursor: result.links?.next,
          hasMore,
        };
      },
      parseResponse: async (response) => {
        if (!response.ok) {
          if (response.status !== 404) {
            showFailureToast(new Error(response.statusText), {
              title: "Failed to search plants",
            });
          }
          return emptyResponse();
        }
        try {
          const res = await response.json();
          return res;
        } catch (_error) {
          return emptyResponse();
        }
      },
    },
  );

  const uniqueData =
    query.length > 1
      ? (Array.from(new Set(data.map((plant) => plant.id)))
          .map((id) => data.find((plant) => plant.id === id))
          .filter((plant) => plant !== undefined) as SpeciesLight[])
      : [];

  return { data: uniqueData, total: query.length > 1 ? total : 0, ...rest };
};

export default useSearch;
