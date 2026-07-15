import { getPreferenceValues } from "@raycast/api";

export const IssueIdFormat = {
  JIRA_STYLE: new RegExp("([A-Z]+-\\d+)", "gm"),
  GITHUB_STYLE: new RegExp("#(\\d+)", "gm"),
};

export type IssueIdStyle = keyof typeof IssueIdFormat;

export const getPreferences = (): Preferences => {
  return getPreferenceValues<Preferences>();
};
