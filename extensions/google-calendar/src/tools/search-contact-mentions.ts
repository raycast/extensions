import { Icon } from "@raycast/api";
import { withCache } from "@raycast/utils";
import { toContactMentions, toMentionPeople } from "../lib/contact-mentions";
import { getAccountKey, listRecentContacts, searchContacts, withGoogleAPIs } from "../lib/google";

type Input = {
  /** What the user typed in the Contacts mention search, empty for the default list. */
  query: string;
};

const cachedPeople = withCache(
  async (accountKey: string, query: string) =>
    toMentionPeople(query ? await searchContacts(query) : await listRecentContacts()),
  {
    maxAge: 1000 * 60 * 60,
    validate: (people) => people.length > 0,
  },
);

async function searchContactMentions(input: Input) {
  const query = input.query.trim();
  return toContactMentions(await cachedPeople(await getAccountKey(), query), query, Icon.PersonCircle);
}

export default withGoogleAPIs(searchContactMentions);
