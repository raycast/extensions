import { List } from "@raycast/api";
import { useEffect, useState } from "react";
import { useCachedState } from "@raycast/utils";
import { getAvailableProfiles, getLocalStatePath } from "../util";
import { CometProfile } from "../interfaces";
import { DEFAULT_COMET_PROFILE_ID, COMET_PROFILE_KEY } from "../constants";
import * as fs from "fs";

interface Props {
  onProfileSelected?: (profile: string) => void;
}

export default function CometProfileDropDown({ onProfileSelected }: Props) {
  const [selectedProfile, setSelectedProfile] = useCachedState<string>(COMET_PROFILE_KEY, DEFAULT_COMET_PROFILE_ID);
  const [profiles, setProfiles] = useState<CometProfile[]>([]);

  useEffect(() => {
    // Load profiles with real names from Local State file
    const availableProfiles = getAvailableProfiles();
    let profileList: CometProfile[] = [];

    try {
      // Try to read profile names from Local State
      const localStatePath = getLocalStatePath();
      if (fs.existsSync(localStatePath)) {
        const cometState = fs.readFileSync(localStatePath, "utf-8");
        const parsed = JSON.parse(cometState);

        if (parsed.profile?.info_cache) {
          const profileInfoCache = parsed.profile.info_cache;
          profileList = availableProfiles.map((id) => {
            const profileInfo = profileInfoCache[id];
            return {
              id: id,
              name: profileInfo?.name || (id === "Default" ? "Default" : id),
            };
          });
        }
      }
    } catch (error) {
      // Fallback to directory names if Local State reading fails
    }

    // Fallback: use directory names if Local State didn't work
    if (profileList.length === 0) {
      profileList = availableProfiles.map((id) => ({
        name: id === "Default" ? "Default" : id.startsWith("Profile ") ? id : `Profile ${id}`,
        id: id,
      }));
    }

    // Always include at least a default profile
    if (profileList.length === 0) {
      profileList.push({ id: DEFAULT_COMET_PROFILE_ID, name: "Default" });
    }

    setProfiles(profileList);

    // Set default profile if none selected and profiles available
    if (!selectedProfile && profileList.length > 0) {
      setSelectedProfile(profileList[0].id);
    }
  }, []);

  useEffect(() => {
    if (selectedProfile && profiles.length > 0) {
      onProfileSelected?.(selectedProfile);
    }
  }, [selectedProfile, profiles]);

  return (
    <List.Dropdown tooltip="Select Comet Profile" value={selectedProfile} onChange={setSelectedProfile}>
      {profiles.map((profile) => (
        <List.Dropdown.Item key={profile.id} value={profile.id} title={profile.name} />
      ))}
    </List.Dropdown>
  );
}
