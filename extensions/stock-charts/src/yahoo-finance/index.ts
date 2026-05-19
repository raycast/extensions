import { search } from "./search";
import { quote, currentPriceInfo } from "./quote";
import { fetchChart, INTERVAL_MAP } from "./chart";
import { fetchNews } from "./news";

export type { SearchResult, SearchQuote } from "./search";
export type { Quote, QuoteResponse, PriceInfo } from "./quote";
export type { ChartData } from "./chart";
export type { NewsItem } from "./news";
export { YahooFinanceError } from "./client";

export default {
  search,
  quote,
  currentPriceInfo,
  fetchChart,
  fetchNews,
  INTERVAL_MAP,
};
