import { loadVisibleProfiles } from "../util/profiles";
import { getSelectedBrowser } from "../util/types";

export default async function listProfiles() {
  const profiles = await loadVisibleProfiles(getSelectedBrowser());
  return profiles.map(({ name, directory }) => ({ name, directory }));
}
