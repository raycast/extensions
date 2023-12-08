import { existsSync, promises } from "fs";
import { useEffect } from "react";

import { List } from "@raycast/api";
import { useCachedPromise, useCachedState } from "@raycast/utils";

import { BRAVE_PROFILES_KEY, BRAVE_PROFILE_KEY, DEFAULT_BRAVE_PROFILE_ID } from "../constants";
import type { BraveProfile } from "../interfaces";
import { getLocalStatePath } from "../util";

interface Props {
  onProfileSelected?: (profile: string) => void;
}

async function loadBraveProfiles(): Promise<BraveProfile[]> {
  const path = getLocalStatePath();
  if (!existsSync(path)) {
    return [{ name: "Default", id: "Default" }];
  }

  const braveState = await promises.readFile(path, "utf-8");
  const profiles = JSON.parse(braveState).profile.info_cache;
  return Object.entries<{ name: string }>(profiles).map(([key, val]) => ({
    name: val.name,
    id: key,
  }));
}

export default function BraveProfileDropDown({ onProfileSelected }: Props) {
  const [selectedProfile, setSelectedProfile] = useCachedState<string>(BRAVE_PROFILE_KEY, DEFAULT_BRAVE_PROFILE_ID);
  const [profiles, setProfiles] = useCachedState<BraveProfile[]>(BRAVE_PROFILES_KEY, [
    { name: "Default", id: DEFAULT_BRAVE_PROFILE_ID },
  ]);
  const { data: loadedProfiles } = useCachedPromise(loadBraveProfiles);

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
    <List.Dropdown tooltip="Select Brave Profile" value={selectedProfile} onChange={setSelectedProfile}>
      {profiles.map((profile) => (
        <List.Dropdown.Item key={profile.id} value={profile.id} title={profile.name} />
      ))}
    </List.Dropdown>
  );
}
