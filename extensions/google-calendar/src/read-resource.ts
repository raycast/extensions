import { readContactMention } from "./lib/contact-mentions";
import { searchContacts, withGoogleAPIs } from "./lib/google";

type Input = {
  /** The URI of a person selected from the Contacts mention search. */
  uri: string;
};

async function readResource({ uri }: Input) {
  return readContactMention(uri, searchContacts);
}

export default withGoogleAPIs(readResource);
