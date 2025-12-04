import { withCache } from "@raycast/utils";
import { withGoogleAPIs, getPeopleClient } from "../lib/google";

const getCurrentUser = async () => {
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
};

export const tool = async () => {
  const cachedGetCurrentUser = withCache(getCurrentUser);
  return await cachedGetCurrentUser();
};

export default withGoogleAPIs(tool);
