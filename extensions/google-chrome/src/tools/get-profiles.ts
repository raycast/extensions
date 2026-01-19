import { loadChromeProfiles } from "../components/ChromeProfileDropdown";

export default async function () {
  const profiles = await loadChromeProfiles();
  return profiles;
}
