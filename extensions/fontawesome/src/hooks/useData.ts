import { useCachedState, useFetch } from "@raycast/utils";
import type { KitIconsResult, SearchItem, SearchResult } from "@/types";
import { familyStylesByPrefix } from "@/utils/data";
import { iconQuery, kitIconsQuery } from "@/utils/query";

type ApiResult = SearchResult | KitIconsResult | undefined;

export const useData = (accessToken: string, execute: boolean, query: string, type: string) => {
  const [iconData, setIconData] = useCachedState<ApiResult>("iconData");

  const isKitSelection = type.startsWith("kit:");
  const kitToken = isKitSelection ? type.replace("kit:", "") : "";

  const body = isKitSelection ? kitIconsQuery() : iconQuery(query, familyStylesByPrefix[type]);

  // Fetch icons for a specific family/style or kit based on query
  const { isLoading, data, revalidate } = useFetch<ApiResult>("https://api.fontawesome.com", {
    execute: !!(accessToken && execute),
    keepPreviousData: true,
    method: "POST",
    body,
    onData: (result) => {
      setIconData(result);
    },
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
  });

  const raw = iconData || data;

  let normalized: SearchItem[] = [];

  if (raw) {
    if (isKitSelection) {
      const kitResult = raw as KitIconsResult;
      const kits = kitResult?.data?.me?.kits ?? [];
      const kit = kits.find((k: { token: string; id: string }) => k.token === kitToken || k.id === kitToken) ?? kits[0];
      const uploads = kit?.iconUploads ?? [];

      const trimmedQuery = query.trim().toLowerCase();

      normalized = uploads
        .filter((upload) => {
          if (!trimmedQuery) {
            return true;
          }

          const nameMatch = upload.name.toLowerCase().includes(trimmedQuery);

          const unicodeValue = upload.unicode;
          const unicodeString =
            typeof unicodeValue === "string" || typeof unicodeValue === "number" ? String(unicodeValue) : "";
          const unicodeMatch = unicodeString.toLowerCase().includes(trimmedQuery);

          return nameMatch || unicodeMatch;
        })
        .map((upload) => {
          const rawPathData = upload.pathData;
          const paths = Array.isArray(rawPathData) ? rawPathData : [rawPathData];

          const svgHtml = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${upload.width} ${upload.height}">${paths
            .map((d) => `<path d="${d}"/>`)
            .join("")}</svg>`;

          return {
            id: upload.name,
            unicode: upload.unicode ?? "",
            svgs: [
              {
                html: svgHtml,
                familyStyle: {
                  prefix: "kit",
                },
              },
            ],
          };
        });
    } else {
      const searchResult = raw as SearchResult;
      normalized = (searchResult?.data?.search ?? []) as SearchItem[];
    }
  }

  const filteredData = normalized.filter((searchItem) => searchItem.svgs.length != 0);

  return { isLoading, data: filteredData, revalidate };
};
