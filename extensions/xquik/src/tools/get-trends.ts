import { fetchTrends } from "../lib/trends";

type Input = {
  /**
   * A Where On Earth ID. Use 1 for Worldwide, 23424977 for the United States, 23424975 for the United Kingdom,
   * 23424969 for Turkey and 23424856 for Japan. Defaults to 1.
   */
  woeid?: number;
};

/**
 * List up to 30 topics trending on X for a place.
 */
export default async function tool({ woeid = 1 }: Input) {
  const trends = await fetchTrends(woeid);
  return trends.map(({ name, rank, tweetVolume, url }) => ({ name, rank, posts: tweetVolume, url }));
}
