import Sort from "./Sort";

export const relevance = {
  sortValue: "relevance",
  name: "Relevance",
} as Sort;
export const hot = {
  sortValue: "hot",
  name: "Hot",
} as Sort;
export const top = {
  sortValue: "top",
  name: "Top",
} as Sort;
export const latest = {
  sortValue: "new",
  name: "Latest",
} as Sort;
export const comments = {
  sortValue: "comments",
  name: "Comments",
} as Sort;

export const allSortOrders = [relevance, hot, top, latest, comments];

export const getSortFromValue = (sortValue: string) => allSortOrders.find((x) => x.sortValue === sortValue) as Sort;

export default { relevance, hot, top, latest, comments, allSortOrders, getSortFromValue };
