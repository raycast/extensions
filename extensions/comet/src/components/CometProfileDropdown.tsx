import { List } from "@raycast/api";
import { useEffect } from "react";
import { useCachedPromise, useCachedState } from "@raycast/utils";
import { existsSync, promises } from "fs";
import { getLocalStatePath } from "../util";
import { CometProfile } from "../interfaces";
import { DEFAULT_COMET_PROFILE_ID, COMET_PROFILE_KEY, COMET_PROFILES_KEY } from "../constants";

interface Props {
  onProfileSelected?: (profile: string) => void;
}

async function loadCometProfiles(): Promise<CometProfile[]> {
  const path = getLocalStatePath();
  if (!existsSync(path)) {
    return [{ name: "Default", id: "Default" }];
  }

  const cometState = await promises.readFile(path, "utf-8");
  const profiles = JSON.parse(cometState).profile.info_cache;
  return Object.entries<{ name: string }>(profiles).map(([key, val]) => ({
    name: val.name,
    id: key,
  }));
}

export default function CometProfileDropDown({ onProfileSelected }: Props) {
  const [selectedProfile, setSelectedProfile] = useCachedState<string>(COMET_PROFILE_KEY, DEFAULT_COMET_PROFILE_ID);
  const [profiles, setProfiles] = useCachedState<CometProfile[]>(COMET_PROFILES_KEY, [
    { name: "Person 1", id: DEFAULT_COMET_PROFILE_ID },
  ]);
  const { data: loadedProfiles } = useCachedPromise(loadCometProfiles);

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
    <List.Dropdown tooltip="Select Comet Profile" value={selectedProfile} onChange={setSelectedProfile}>
      {profiles.map((profile) => (
        <List.Dropdown.Item key={profile.id} value={profile.id} title={profile.name} />
      ))}
    </List.Dropdown>
  );
}
