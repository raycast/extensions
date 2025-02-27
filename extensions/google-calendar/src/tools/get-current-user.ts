import { withGoogleAPIs, getPeopleClient } from "../google";
import { withCache } from "../utils";

export const tool = async () => {
  return withCache(async () => {
    const people = getPeopleClient();

    const person = await people.people.get({
      resourceName: "people/me",
      personFields: "names,emailAddresses",
    });

    return {
      displayName: person.data.names?.[0]?.displayName,
      givenName: person.data.names?.[0]?.givenName,
      familyName: person.data.names?.[0]?.familyName,
      email: person.data.emailAddresses?.[0]?.value,
    };
  });
};

export default withGoogleAPIs(tool);
