import { Site } from "./site";
import { get } from "./util";

// API via OAuth to get list of sites
export async function fetchSites() {
  return (await get("https://api.atlassian.com/oauth/token/accessible-resources")) as Site[];
}
