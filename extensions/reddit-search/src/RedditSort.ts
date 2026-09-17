import { Icon } from "@raycast/api";
import Sort from "./Sort";

export const relevance = {
  sortValue: "relevance",
  name: "Relevance",
  icon: Icon.MagnifyingGlass,
} as Sort;
export const hot = {
  sortValue: "hot",
  name: "Hot",
  icon: Icon.Bolt,
} as Sort;
export const top = {
  sortValue: "top",
  name: "Top",
  icon: Icon.ArrowUp,
} as Sort;
export const latest = {
  sortValue: "new",
  name: "Latest",
  icon: Icon.Clock,
} as Sort;
export const comments = {
  sortValue: "comments",
  name: "Comments",
  icon: Icon.SpeechBubble,
} as Sort;

export const allSortOrders = [relevance, hot, top, latest, comments];

export const getSortFromValue = (sortValue: string) => allSortOrders.find((x) => x.sortValue === sortValue) as Sort;

export default { relevance, hot, top, latest, comments, allSortOrders, getSortFromValue };
