import { List } from "@raycast/api";
import { useEffect } from "react";
import { useCachedPromise, useCachedState } from "@raycast/utils";
import { existsSync, promises } from "fs";
import { getLocalStatePath } from "../util";
import { ChromeProfile } from "../interfaces";
import { DEFAULT_CHROME_PROFILE_ID, CHROME_PROFILE_KEY, CHROME_PROFILES_KEY } from "../constants";

interface Props {
  onProfileSelected?: (profile: string) => void;
}

async function loadChromeProfiles(): Promise<ChromeProfile[]> {
  const path = getLocalStatePath();
  if (!existsSync(path)) {
    return [{ name: "Default", id: "Default" }];
  }

  const chromeState = await promises.readFile(path, "utf-8");
  const profiles = JSON.parse(chromeState).profile.info_cache;
  return Object.entries<{ name: string }>(profiles).map(([key, val]) => ({
    name: val.name,
    id: key,
  }));
}

export default function ChromeProfileDropDown({ onProfileSelected }: Props) {
  const [selectedProfile, setSelectedProfile] = useCachedState<string>(CHROME_PROFILE_KEY, DEFAULT_CHROME_PROFILE_ID);
  const [profiles, setProfiles] = useCachedState<ChromeProfile[]>(CHROME_PROFILES_KEY, [
    { name: "Person 1", id: DEFAULT_CHROME_PROFILE_ID },
  ]);
  const { data: loadedProfiles } = useCachedPromise(loadChromeProfiles);

  useEffect(() => {
    if (loadedProfiles) {
      setProfiles(loadedProfiles);
      if (!selectedProfile) {
        setSelectedProfile(profiles[0].id);
      }
    }
  }, [loadedProfiles]);

  useEffect(() => {
    if (selectedProfile) {
      onProfileSelected?.(selectedProfile);
    }
  }, [selectedProfile]);

  if (!profiles || profiles.length < 2) {
    return null;
  }

  return (
    <List.Dropdown tooltip="Select Chrome Profile" value={selectedProfile} onChange={setSelectedProfile}>
      {profiles.map((profile) => (
        <List.Dropdown.Item key={profile.id} value={profile.id} title={profile.name} />
      ))}
    </List.Dropdown>
  );
}
