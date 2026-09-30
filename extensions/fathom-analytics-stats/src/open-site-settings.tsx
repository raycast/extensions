import { getPreferenceValues, open } from "@raycast/api";

export default async function Command() {
  open(`https://app.usefathom.com/sites/${getPreferenceValues<Preferences>().siteId}`);
}
