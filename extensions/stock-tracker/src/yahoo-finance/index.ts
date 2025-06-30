import { search } from "./search";
export type { SearchResult } from "./search";
import { quote, currentPriceInfo } from "./quote";
export type { Quote } from "./quote";

export default {
  search,
  quote,
  currentPriceInfo,
};
