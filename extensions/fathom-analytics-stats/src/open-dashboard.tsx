import { getPreferenceValues, open } from "@raycast/api";

interface Preferences {
  apiToken: string;
  siteId: string;
}

export default async function Command() {
  open(`https://app.usefathom.com/?site=${getPreferenceValues<Preferences>().siteId}`);
}
