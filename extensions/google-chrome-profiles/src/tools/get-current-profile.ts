import { readCurrentProfile } from "../util/chrome";
import { getSelectedBrowser } from "../util/types";

export default async function getCurrentProfile() {
  const { name } = await readCurrentProfile(getSelectedBrowser());
  return { profile: name };
}
