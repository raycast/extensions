import { useCachedState } from "@raycast/utils";
import { Location } from "./types";
import { execSync, exec } from "child_process";
import { environment } from "@raycast/api";
import { join } from "path";
import { existsSync } from "fs";
import { getDefaultPath } from "./snippets";
import { useEffect } from "react";

export function useLocations() {
  const locationCache = useCachedState<Location[]>("locations", []);
  const [locations] = locationCache;
  useEffect(() => {
    // refresh git-based locations when locations change
    locations.forEach((loc) => loc.git && refreshGitLocation(loc));
  }, [locations]);
  return locationCache;
}

export function isGitInstalled() {
  try {
    return execSync("git --version").toString().includes("git version");
  } catch {
    return false;
  }
}

export function refreshGitLocation(location: Location) {
  if (!location.git) return new Promise<string>((_, reject) => reject("Not a git location"));
  if (!isGitInstalled()) return new Promise<string>((_, reject) => reject("Git is not installed"));

  let script = "";

  const basePath = getLocationPath(location);
  if (!existsSync(basePath)) {
    // folder does not exist, clone to repo
    script = `git clone ${location.path} '${basePath}'`;
    console.log(script);
  } else {
    // folder exists, reset and pull latest changes
    script = `cd '${basePath}' && git reset --hard && git pull`;
  }

  return new Promise<string>((resolve, reject) =>
    exec(script, (error, stdout, stderr) => (error ? reject(stderr) : resolve(stdout)))
  );
}

export function getLocationPath(location?: Location) {
  if (location?.git) {
    return join(environment.supportPath, "git", location.id);
  } else {
    return location?.path ?? getDefaultPath();
  }
}
