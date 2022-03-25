import queryString from "query-string";

export const getUrlParamsString = (url: string): string =>
  queryString.stringify(queryString.parse(new URL(url).search));
