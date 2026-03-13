import queryString from "query-string";
import formatDate from "date-fns/format";

export const getUrlParamsString = (url: string): string =>
  queryString.stringify(queryString.parse(new URL(url).search));

export const getFormatedDateString = (date: string) => formatDate(new Date(date), "MMMM dd, yyyy hh:mm");

export const joinStringsWithDelimiter: (values: (string | null | undefined)[], delimiter: string) => string = (
  values,
  delimiter
) => {
  if (values) {
    return values.filter(Boolean).join(delimiter);
  }

  return "";
};

export const getListSubtitle = (loading: boolean, totalCount: number) =>
  loading ? "Loading..." : totalCount.toString();
