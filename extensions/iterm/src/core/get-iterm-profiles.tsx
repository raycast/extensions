import { execFileSync } from "child_process";
import { homedir } from "os";
import { join } from "path";
import plist from "plist";

export interface ItermProfile {
  name: string;
  guid: string;
}

const PlistPreferences = {
  USER_REL_PATH: "Library/Preferences/com.googlecode.iterm2.plist",
  Keys: {
    PROFILES: "New Bookmarks",
  },
};

type CapitalizeKeys<Type> = {
  [Property in keyof Type as Capitalize<string & Property>]: Type[Property];
};

type PlistProfile = CapitalizeKeys<ItermProfile>;

function isPlistProfile(entry: unknown): entry is PlistProfile {
  return (
    typeof entry === "object" &&
    entry !== null &&
    "Name" in entry &&
    "Guid" in entry &&
    typeof (entry as PlistProfile).Name === "string" &&
    typeof (entry as PlistProfile).Guid === "string"
  );
}

export function getItermProfiles(): ItermProfile[] {
  // prettier-ignore
  const plutilArgs = [
    "-extract", PlistPreferences.Keys.PROFILES, "xml1",
    "-o", "-",
    join(homedir(), PlistPreferences.USER_REL_PATH),
  ];

  try {
    const output = execFileSync("/usr/bin/plutil", plutilArgs, {
      encoding: "utf-8",
      maxBuffer: 10 * 1024 * 1024,
    });
    const profiles = plist.parse(output);

    if (!Array.isArray(profiles)) {
      console.error("Expected an array of profiles from iTerm preferences");
      return [];
    }

    return profiles.filter(isPlistProfile).map((profile) => ({ name: profile.Name, guid: profile.Guid }));
  } catch (error) {
    console.error("Failed to read iTerm profiles:", error);
    return [];
  }
}
