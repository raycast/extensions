import { useEffect, useState } from "react";
import { parseFileSync } from "bplist-parser";
import { join } from "path";
import { ProfileList } from "../types";
import { getOrionAppIdentifier, getOrionBasePath, getProfilesPath } from "src/utils";
import { homedir } from "os";
import { useCachedState } from "@raycast/utils";

const useProfiles = () => {
  const [profiles, setProfiles] = useState<ProfileList>();
  const profilesPath = getProfilesPath();

  useEffect(() => {
    // profilesPlist is an array of one element
    const profilesPlist = parseFileSync(profilesPath);
    const profiles = parseProfiles(profilesPlist[0]);
    setProfiles(profiles);
  }, []);

  return { profiles };
};

export const useSelectedProfileId = (id: string) => {
  const [selectedProfileId, setSelectedProfileId] = useCachedState<string>("ORION_SELECTED_PROFILE_ID", id);
  return { selectedProfileId, setSelectedProfileId };
};

// eslint-disable-next-line  @typescript-eslint/no-explicit-any
function parseProfiles(items: any): ProfileList {
  return {
    default: {
      name: items.defaults.name,
      id: "Defaults",
      color: items.defaults.color,
      dataPath: join(getOrionBasePath(), "Defaults"),
      // TODO: dynamically find location
      appPath: `/Applications/${getOrionAppIdentifier()}.app`,
    },
    // eslint-disable-next-line  @typescript-eslint/no-explicit-any
    profiles: items.profiles.map((p: any) => {
      return {
        name: p.name,
        id: p.identifier,
        color: p.color,
        dataPath: join(getOrionBasePath(), p.identifier),
        // TODO: dynamically find location
        // format: /Users/USER/Applications/Orion( RC)/Orion( RC) Profiles/Orion - PROFILE_NAME.app
        appPath: join(
          homedir(),
          "Applications",
          getOrionAppIdentifier(),
          `${getOrionAppIdentifier()} Profiles`,
          p.identifier,
          `${getOrionAppIdentifier()} - ${p.name}.app`,
        ),
      };
    }),
  };
}

export default useProfiles;
