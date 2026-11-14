import { request } from "./api";
import { Trend, trendListSchema } from "./schemas";

const TREND_COUNT = 30;

// A static table, since /x/trends/locations bills 1 credit per returned place.
export const TREND_PLACES = [
  { title: "Worldwide", woeid: 1 },
  { title: "United States", woeid: 23424977 },
  { title: "United Kingdom", woeid: 23424975 },
  { title: "Canada", woeid: 23424775 },
  { title: "Australia", woeid: 23424748 },
  { title: "India", woeid: 23424848 },
  { title: "Germany", woeid: 23424829 },
  { title: "France", woeid: 23424819 },
  { title: "Spain", woeid: 23424950 },
  { title: "Brazil", woeid: 23424768 },
  { title: "Japan", woeid: 23424856 },
  { title: "Turkey", woeid: 23424969 },
  { title: "Mexico", woeid: 23424900 },
  { title: "Indonesia", woeid: 23424846 },
  { title: "Saudi Arabia", woeid: 23424938 },
  { title: "United Arab Emirates", woeid: 23424738 },
];

export async function fetchTrends(woeid: number): Promise<Trend[]> {
  const { trends } = await request(trendListSchema, "/x/trends", { query: { woeid, count: TREND_COUNT } });
  return trends;
}

// X sends the query form-encoded, as in %23AI, and the search route wants it plain.
export function trendQuery({ name, query }: Trend): string {
  return query ? (new URLSearchParams(`q=${query}`).get("q") ?? name) : name;
}
