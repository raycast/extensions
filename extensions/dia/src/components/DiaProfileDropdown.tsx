import { List } from "@raycast/api";
import { useEffect } from "react";
import { useCachedPromise, useCachedState } from "@raycast/utils";
import { DiaProfile } from "../interfaces";
import { DEFAULT_DIA_PROFILE_ID, DIA_PROFILE_KEY, DIA_PROFILES_KEY } from "../constants";
import { loadDiaProfiles } from "../util";

interface Props {
  onProfileSelected?: (profile: string) => void;
}

export default function DiaProfileDropdown({ onProfileSelected }: Props) {
  const [selectedProfile, setSelectedProfile] = useCachedState<string>(DIA_PROFILE_KEY, DEFAULT_DIA_PROFILE_ID);
  const [profiles, setProfiles] = useCachedState<DiaProfile[]>(DIA_PROFILES_KEY, [
    { name: DEFAULT_DIA_PROFILE_ID, id: DEFAULT_DIA_PROFILE_ID },
  ]);

  const { data, error } = useCachedPromise(loadDiaProfiles);

  useEffect(() => {
    if (data) {
      setProfiles(data.profiles);
      if (!selectedProfile) {
        if (data.defaultProfile) {
          setSelectedProfile(data.defaultProfile);
        } else if (data.profiles.length > 0) {
          setSelectedProfile(data.profiles[0].id);
        }
      }
    }
  }, [data]);

  useEffect(() => {
    if (selectedProfile) {
      onProfileSelected?.(selectedProfile);
    }
  }, [selectedProfile]);

  if (error || !profiles || profiles.length < 2) {
    return null;
  }

  return (
    <List.Dropdown tooltip="Select a Dia profile" value={selectedProfile} onChange={setSelectedProfile}>
      {profiles.map((profile) => (
        <List.Dropdown.Item key={profile.id} value={profile.id} title={profile.name} />
      ))}
    </List.Dropdown>
  );
}
