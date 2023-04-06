import { List } from "@raycast/api";
import { useEffect } from "react";
import { useCachedPromise, useCachedState } from "@raycast/utils";
import { existsSync, promises } from "fs";
import { getLocalStatePath } from "../util";
import { VivaldiProfile } from "../interfaces";
import { DEFAULT_VIVALDI_PROFILE_ID, VIVALDI_PROFILE_KEY, VIVALDI_PROFILES_KEY } from "../constants";

interface Props {
  onProfileSelected?: (profile: string) => void;
}

async function loadChromeProfiles(): Promise<VivaldiProfile[]> {
  const path = getLocalStatePath();
  if (!existsSync(path)) {
    return [{ name: "Default", id: "Default" }];
  }

  const vivaldiState = await promises.readFile(path, "utf-8");
  const profiles = JSON.parse(vivaldiState).profile.info_cache;
  return Object.entries<{ name: string }>(profiles).map(([key, val]) => ({
    name: val.name,
    id: key,
  }));
}

export default function VivaldiProfileDropDown({ onProfileSelected }: Props) {
  const [selectedProfile, setSelectedProfile] = useCachedState<string>(VIVALDI_PROFILE_KEY, DEFAULT_VIVALDI_PROFILE_ID);
  const [profiles, setProfiles] = useCachedState<VivaldiProfile[]>(VIVALDI_PROFILES_KEY, [
    { name: "Person 1", id: DEFAULT_VIVALDI_PROFILE_ID },
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
    <List.Dropdown tooltip="Select Vivaldi Profile" value={selectedProfile} onChange={setSelectedProfile}>
      {profiles.map((profile) => (
        <List.Dropdown.Item key={profile.id} value={profile.id} title={profile.name} />
      ))}
    </List.Dropdown>
  );
}
