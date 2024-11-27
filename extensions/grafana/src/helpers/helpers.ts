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

  return preferences.rootApiUrl + `/explore?${encodeURI(`schemaVersion=1&&panes=${JSON.stringify(URLQuery)}`)}`;
};
