import { List } from "@raycast/api";
import { useEffect } from "react";
import { useCachedPromise, useCachedState } from "@raycast/utils";
import { existsSync, promises } from "fs";
import { getLocalStatePath } from "../util";
import { EdgeProfile } from "../interfaces";
import { DEFAULT_EDGE_PROFILE_ID, EDGE_PROFILE_KEY, EDGE_PROFILES_KEY } from "../constants";

interface Props {
  onProfileSelected?: (profile: string) => void;
}

async function loadEdgeProfiles(): Promise<EdgeProfile[]> {
  const path = getLocalStatePath();
  if (!existsSync(path)) {
    return [{ name: "Profile 1", id: "Default" }];
  }

  const edgeState = await promises.readFile(path, "utf-8");
  const profiles = JSON.parse(edgeState).profile.info_cache;
  return Object.entries<{ name: string }>(profiles).map(([key, val]) => ({
    name: val.name,
    id: key,
  }));
}

export default function EdgeProfileDropDown({ onProfileSelected }: Props) {
  const [selectedProfile, setSelectedProfile] = useCachedState<string>(EDGE_PROFILE_KEY, DEFAULT_EDGE_PROFILE_ID);
  const [profiles, setProfiles] = useCachedState<EdgeProfile[]>(EDGE_PROFILES_KEY, [
    { name: "Profile 1", id: DEFAULT_EDGE_PROFILE_ID },
  ]);
  const { data: loadedProfiles } = useCachedPromise(loadEdgeProfiles);

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
    <List.Dropdown tooltip="Select Edge Profile" value={selectedProfile} onChange={setSelectedProfile}>
      {profiles.map((profile) => (
        <List.Dropdown.Item key={profile.id} value={profile.id} title={profile.name} />
      ))}
    </List.Dropdown>
  );
}
