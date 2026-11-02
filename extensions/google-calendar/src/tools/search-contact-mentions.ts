import { Icon } from "@raycast/api";
import { withCache } from "@raycast/utils";
import { toContactMentions, toMentionPeople } from "../lib/contact-mentions";
import { listRecentContacts, searchContacts, withGoogleAPIs } from "../lib/google";

type Input = {
  /** What the user typed in the Contacts mention search, empty for the default list. */
  query: string;
};

const cachedPeople = withCache(
  async (query: string) => toMentionPeople(query ? await searchContacts(query) : await listRecentContacts()),
  {
    maxAge: 1000 * 60 * 60, // 1 hour
    validate: (people) => people.length > 0, // Retry empty results so new contacts show up
  },
);

async function searchContactMentions(input: Input) {
  const query = input.query.trim();
  return toContactMentions(await cachedPeople(query), query, Icon.PersonCircle);
}

export default withGoogleAPIs(searchContactMentions);
