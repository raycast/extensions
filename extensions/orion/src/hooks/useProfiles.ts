import { useCallback, useEffect, useState } from "react";
import { parseFileSync } from "bplist-parser";
import { join } from "path"
import { ProfileList } from "../types";
import { getOrionAppIdentifier, getOrionBasePath, getProfilesPath } from "src/utils";
import { homedir } from "os";

const useProfiles = () => {
  const [profiles, setProfiles] = useState<ProfileList>();
  const profilesPath = getProfilesPath();

  const fetchItems = useCallback(async () => {
    const profilesPlist = parseFileSync(profilesPath);
    const items = profilesPlist[0];
    const profiles = parseProfiles(items);
    setProfiles(profiles);
  }, []);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  return { profiles };
};

function parseProfiles(items: any): ProfileList {
  return {
    default: {
      name: items.defaults.name,
      id: "Default",
      color: items.defaults.color,
      dataPath:  join(getOrionBasePath(), "Defaults"),
      // TODO: fix this
      appPath: "/Applications/Orion RC.app",
    },
    profiles: items.profiles.map((p: any) => {
      return {
        name: p.name,
        id: p.identifier,
        color: p.color,
        dataPath: join(getOrionBasePath(), p.identifier),
        // TODO: fix this
        appPath: join(homedir(), "Applications", getOrionAppIdentifier(), "Orion RC Profiles", p.identifier, "Orion RC - " + p.name + ".app")
      };
    })
  }
}


export default useProfiles;

