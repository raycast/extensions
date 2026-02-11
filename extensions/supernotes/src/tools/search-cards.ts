import { superfetch } from "~/api/superfetch";
import { getSupernotesPrefs } from "~/utils/helpers";

type Input = {
  /**
   * The search term to search for when looking for cards, optional
   */
  searchTerm?: string;

  /**
   * The date range to search for cards, should be in ISO-8601 format in the user's timezone, optional, should not be the same as dateRangeTo
   */
  dateRangeFrom?: string;

  /**
   * The date range to search for cards, should be in ISO-8601 format in the user's timezone, optional. If asking for a specific day then the from should be the day they request and the to should be the next day.
   */
  dateRangeTo?: string;
};

export default async function ({ searchTerm, dateRangeFrom, dateRangeTo }: Input) {
  const { apiKey } = getSupernotesPrefs();
  const fetched = await superfetch("/v1/cards/get/select", "post", {
    apiKey,
    body: {
      search: searchTerm,
      include_membership_statuses: [1, 2],
      limit: 5,
      targeted_or_created_when:
        dateRangeFrom && dateRangeTo
          ? {
              from_when: dateRangeFrom,
              to_when: dateRangeTo,
            }
          : undefined,
    },
  });

  if (!fetched.ok) {
    throw new Error(`There was a problem searching for cards: ${fetched.body.detail}`);
  }

  return Object.values(fetched.body);
}
