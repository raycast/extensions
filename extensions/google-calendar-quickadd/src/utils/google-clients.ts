import { auth, calendar_v3 } from "@googleapis/calendar";

export function createCalendarClient(token: string): calendar_v3.Calendar {
  const oauth = new auth.OAuth2({
    // Gaxios's dynamic node-fetch import is not callable in Raycast's shared dependency bundles.
    transporterOptions: { fetchImplementation: globalThis.fetch },
  });
  oauth.setCredentials({ access_token: token });
  return new calendar_v3.Calendar({ auth: oauth });
}
