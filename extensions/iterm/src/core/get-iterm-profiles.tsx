import { execFileSync } from "child_process";
import { homedir } from "os";
import { join } from "path";

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

/** A profile representation in the iTerm preferences file (via JSON conversion) */
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
    "-extract", PlistPreferences.Keys.PROFILES, "json",
    "-expect", "array",
    "-o", "-", // Output to stdout
    join(homedir(), PlistPreferences.USER_REL_PATH),
  ];

  try {
    const output = execFileSync("/usr/bin/plutil", plutilArgs, {
      encoding: "utf-8",
      maxBuffer: 10 * 1024 * 1024,
    });
    const profiles = JSON.parse(output) as unknown[]; // Safe assertion due to `-expect array`

    return profiles.filter(isPlistProfile).map((profile) => ({ name: profile.Name, guid: profile.Guid }));
  } catch (error) {
    console.error("Failed to read iTerm profiles:", error);
    return [];
  }
}
