import { Color } from '@raycast/api';
import { useFetch } from '@raycast/utils';

// Community difficulty ratings maintained by zerotrac.
// https://github.com/zerotrac/leetcode_problem_rating
const RATINGS_URL = 'https://raw.githubusercontent.com/zerotrac/leetcode_problem_rating/main/ratings.txt';

export function ratingColor(rating: number): Color {
  if (rating < 1200) return Color.Green;
  if (rating < 1600) return Color.Yellow;
  if (rating < 2000) return Color.Orange;
  return Color.Red;
}

// Shown when ratings are loaded but a problem has no zerotrac rating.
export const UNRATED_LABEL = 'Unrated';

// Tag descriptor for a rating (or the unrated marker when rating is undefined).
export function ratingTag(rating: number | undefined): { value: string; color: Color } {
  return rating != null
    ? { value: String(rating), color: ratingColor(rating) }
    : { value: UNRATED_LABEL, color: Color.SecondaryText };
}

// ratings.txt is tab-separated: Rating, ID, Title, Title ZH, Title Slug, Contest Slug, Problem Index.
// Returns a titleSlug -> rounded rating map. Fetched only when `enabled`.
export function useProblemRatings(enabled: boolean) {
  const { isLoading, data } = useFetch<Record<string, number>>(RATINGS_URL, {
    async parseResponse(response: { ok: boolean; text: () => Promise<string> }) {
      const ratings: Record<string, number> = {};
      if (!response.ok) return ratings;
      const lines = (await response.text()).split('\n');
      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split('\t');
        if (cols.length < 5) continue;
        const rating = Math.round(Number(cols[0]));
        const slug = cols[4];
        if (slug && Number.isFinite(rating)) ratings[slug] = rating;
      }
      return ratings;
    },
    execute: enabled,
    keepPreviousData: true,
  });

  return { ratings: data, isRatingsLoading: isLoading };
}
