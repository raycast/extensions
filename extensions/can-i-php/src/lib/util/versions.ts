import { getPreferenceValues } from "@raycast/api";

export function getVersions() {
  return ["7.4", "8.0", "8.1", "8.2", "8.3", "8.4"];
}

export function getPreferredVersions() {
  const preferences = getPreferenceValues<Preferences>();

  const versions = getVersions();

  return versions.filter((version) => {
    const key = `php_${version.replace(".", "")}` as keyof Preferences;
    return preferences[key];
  });
}
