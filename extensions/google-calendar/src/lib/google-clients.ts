import { auth, calendar_v3 } from "@googleapis/calendar";
import { people_v1 } from "@googleapis/people";

export function createGoogleClients(token: string) {
  const oauth = new auth.OAuth2({
    // Gaxios's dynamic node-fetch import is not callable in Raycast's shared dependency bundles.
    transporterOptions: { fetchImplementation: globalThis.fetch },
  });
  oauth.setCredentials({ access_token: token });

  return {
    calendar: new calendar_v3.Calendar({ auth: oauth }),
    people: new people_v1.People({ auth: oauth }),
  };
}
