import { CompactShow, toCompactShow } from "./compact-media";
import { describeYearFilter, searchShowResults } from "./resolve-media";
import { normalizeTitle, resolveLookupQuery } from "./title-text";

type Input = {
  /**
   * The title of the TV show to search for in the Trakt database.
   * Case-insensitive, supports partial titles.
   * A trailing year ("The Office 2005", "The Office (2005)") is parsed the same as `year`.
   */
  title: string;
  /**
   * The release year of the TV show to filter the results.
   * Optional integer, e.g. 2008.
   */
  year?: number;
};

type Output = {
  data: CompactShow[];
  /**
   * How many shows Trakt returned for the title, before the `year` filter.
   * When `truncated` is false, a value above 0 with an empty `data` means the title exists
   * but not for that year. When it is true, an empty `data` proves nothing.
   */
  matchesForTitle: number;
  /**
   * True when Trakt returned as many releases as it can for the title, so others exist out
   * of reach. Never report an absence as a fact while this is true.
   */
  truncated: boolean;
  message?: string;
  hasMore: boolean;
};

/**
 * Search for TV shows in the Trakt database by title and optional year.
 * Returns a compact list of TV shows with their traktId, title, year, network, and genres.
 * Use this to obtain a show \`traktId\` before a targeted lookup.
 */
export default async function tool(input: Input): Promise<Output> {
  const { title, year } = input;
  const lookup = resolveLookupQuery(title, year);
  const searchTitle = lookup.text ?? title;

  const { items, truncated } = await searchShowResults(searchTitle);
  const rawExact = items.filter((item) => normalizeTitle(item.show.title) === normalizeTitle(title));
  // An exact-title hit only decides whether a year stuffed into `title` is a filter.
  // It must not hide related results ("The Office" still has to return "The Office US").
  const appliedYear = rawExact.length > 0 ? year : lookup.year;
  const shows = appliedYear === undefined ? items : items.filter((item) => item.show.year === appliedYear);

  return {
    data: shows.map(toCompactShow),
    matchesForTitle: items.length,
    truncated,
    message: describeYearFilter(
      rawExact.length > 0 ? title : searchTitle,
      appliedYear,
      shows.length,
      items.length,
      truncated,
    ),
    hasMore: false,
  };
}
