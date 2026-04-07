import { getPreferenceValues } from "@raycast/api";

export type ExtensionPreferences = {
  domain: string;
  token: string;
  unsafeHTTPS: boolean;
  defaultIncludeProjects: string;
  defaultExcludeProjects: string;
  defaultIncludeStatuses: string;
  defaultExcludeStatuses: string;
  defaultIncludeIssueTypes: string;
  defaultExcludeIssueTypes: string;
  defaultIncludeAssignees: string;
  defaultExcludeAssignees: string;
};

const rawPreferenceValues = getPreferenceValues<Record<string, unknown>>();

function readStringPreference(name: string): string {
  const value = rawPreferenceValues[name];
  return typeof value === "string" ? value : "";
}

function readBooleanPreference(name: string): boolean {
  const value = rawPreferenceValues[name];
  return typeof value === "boolean" ? value : false;
}

export const prefs: ExtensionPreferences = {
  domain: readStringPreference("domain"),
  token: readStringPreference("token"),
  unsafeHTTPS: readBooleanPreference("unsafeHTTPS"),
  defaultIncludeProjects: readStringPreference("defaultIncludeProjects"),
  defaultExcludeProjects: readStringPreference("defaultExcludeProjects"),
  defaultIncludeStatuses: readStringPreference("defaultIncludeStatuses"),
  defaultExcludeStatuses: readStringPreference("defaultExcludeStatuses"),
  defaultIncludeIssueTypes: readStringPreference("defaultIncludeIssueTypes"),
  defaultExcludeIssueTypes: readStringPreference("defaultExcludeIssueTypes"),
  defaultIncludeAssignees: readStringPreference("defaultIncludeAssignees"),
  defaultExcludeAssignees: readStringPreference("defaultExcludeAssignees"),
};
