import { clockodo, formatDate, getMe } from "../clockodo";

type Input = {
  /**
   * The minimum date for the returned entries in ISO 8601 format
   */
  timeSince: string;
  /**
   * The maximum date for the returned entries in ISO 8601 format
   */
  timeUntil: string;
};

/** Lists the current user's Clockodo time entries in the given date range (inclusive). */
export default async function (input: Input) {
  const user = await getMe();
  const entries = await clockodo.getEntries({
    timeSince: formatDate(new Date(input.timeSince)),
    timeUntil: formatDate(new Date(input.timeUntil)),
    filter: {
      usersId: user.data.id,
    },
  });

  return entries;
}
