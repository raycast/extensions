import { List } from "@raycast/api";
import { useEffect } from "react";
import { useCachedPromise, useCachedState } from "@raycast/utils";
import { existsSync, promises } from "fs";
import { getLocalStatePath } from "../util";
import { IridiumProfile } from "../interfaces";
import { DEFAULT_IRIDIUM_PROFILE_ID, IRIDIUM_PROFILE_KEY, IRIDIUM_PROFILES_KEY } from "../constants";

interface Props {
  onProfileSelected?: (profile: string) => void;
}

async function loadIridiumProfiles(): Promise<IridiumProfile[]> {
  const path = getLocalStatePath();
  if (!existsSync(path)) {
    return [{ name: "Default", id: "Default" }];
  }

  const iridiumState = await promises.readFile(path, "utf-8");
  const profiles = JSON.parse(iridiumState).profile.info_cache;
  return Object.entries<{ name: string }>(profiles).map(([key, val]) => ({
    name: val.name,
    id: key,
  }));
}

export default function IridiumProfileDropDown({ onProfileSelected }: Props) {
  const [selectedProfile, setSelectedProfile] = useCachedState<string>(IRIDIUM_PROFILE_KEY, DEFAULT_IRIDIUM_PROFILE_ID);
  const [profiles, setProfiles] = useCachedState<IridiumProfile[]>(IRIDIUM_PROFILES_KEY, [
    { name: "Person 1", id: DEFAULT_IRIDIUM_PROFILE_ID },
  ]);
  const { data: loadedProfiles } = useCachedPromise(loadIridiumProfiles);

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
    <List.Dropdown tooltip="Select Iridium Profile" value={selectedProfile} onChange={setSelectedProfile}>
      {profiles.map((profile) => (
        <List.Dropdown.Item key={profile.id} value={profile.id} title={profile.name} />
      ))}
    </List.Dropdown>
  );
}
