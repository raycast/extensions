import { preferences } from "./preferences";

export const createExploreLink = (datasourceUid: string, query?: string) => {
  const URLQuery = {
    zmo: {
      datasource: datasourceUid,
      ...(query && query !== ""
        ? {
            queries: [
              {
                expr: query,
              },
            ],
          }
        : {}),
    },
  };

  return preferences.rootApiUrl + `/explore?schemaVersion=1&panes=${encodeURIComponent(JSON.stringify(URLQuery))}`;
};
