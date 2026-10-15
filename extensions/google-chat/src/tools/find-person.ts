import { withGoogleAuth } from "../api/google";
import { searchDirectory } from "../api/people";
import { personInfo } from "../helpers/dm-names";

type Input = {
  /**
   * Name or email prefix to search for in the organization's directory, e.g. "Sara" or "sara@".
   */
  query: string;
};

/** Searches the Google Workspace directory. */
async function findPerson(input: Input) {
  const people = await searchDirectory(input.query, 20);
  return people.map((person) => {
    const info = personInfo(person);
    return { name: info.name, email: info.email };
  });
}

export default withGoogleAuth(findPerson);
